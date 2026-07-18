#!/usr/bin/env node
// Cron delivery job (runs in GitHub Actions). Finds due subscriptions, generates
// each brief with live data (reusing the web composer), and emails it via Resend.
//
// Env: DATABASE_URL, RESEND_API_KEY, MAIL_FROM, PUBLIC_API_BASE (the Worker origin,
// for building unsubscribe links, e.g. https://fisa-subscriptions.<acct>.workers.dev)

import { client, dueSubscriptions, markSent, markError } from '../src/email/db.js';
import { computeNextRun, describeSelection } from '../src/email/subscription.js';
import { buildBriefEmail } from '../src/email/template.js';
import { sendEmail } from '../src/email/send.js';
import { CMAS } from '../web/js/catalog.js';
import { composeBrief } from '../web/js/compose.js';
import { statcanVector, statcanCoord, bocSeries, VEC, BOC_ID, RENT_PID, VACANCY_PID } from '../web/js/sources.js';

const { DATABASE_URL, RESEND_API_KEY, MAIL_FROM, PUBLIC_API_BASE } = process.env;

function requireEnv() {
  const missing = ['DATABASE_URL', 'RESEND_API_KEY', 'MAIL_FROM', 'PUBLIC_API_BASE'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required env: ${missing.join(', ')}`);
}

// Gather the same live data the browser app does, for one selection.
async function gatherData(sub) {
  const cma = CMAS[sub.cma_key];
  const rentCoord = cma.beds[sub.bedroom];
  const [debt, credit, cpi, rent, vacancy, policy, prime, mtg5] = await Promise.all([
    statcanVector(VEC.debt_to_disposable_income, 16),
    statcanVector(VEC.consumer_credit_mortgage_to_income, 16),
    statcanVector(VEC.cpi_all_items, 40),
    statcanCoord(RENT_PID, rentCoord, 6),
    statcanCoord(VACANCY_PID, cma.vacancyCoord, 6),
    bocSeries(BOC_ID.policy_rate, 2),
    bocSeries(BOC_ID.prime_rate, 2),
    bocSeries(BOC_ID.mortgage_5yr, 2),
  ]);
  return { debt, credit, cpi, rent, vacancy, policy, prime, mtg5 };
}

async function main() {
  requireEnv();
  const sql = client(DATABASE_URL);
  const due = await dueSubscriptions(sql);
  console.log(`[deliver] ${due.length} subscription(s) due`);

  let sent = 0, failed = 0;
  for (const sub of due) {
    const label = describeSelection(sub);
    try {
      const data = await gatherData(sub);
      const sel = { cmaKey: sub.cma_key, bedroom: sub.bedroom, demographicKey: sub.demographic, productKey: sub.product };
      const { markdown } = composeBrief(sel, data);
      const unsubUrl = `${PUBLIC_API_BASE.replace(/\/$/, '')}/api/unsubscribe?t=${sub.unsub_token}`;
      const email = buildBriefEmail({ selectionLabel: label, briefMarkdown: markdown, unsubUrl });
      await sendEmail({ apiKey: RESEND_API_KEY, from: MAIL_FROM, to: sub.email, ...email });
      await markSent(sql, sub.id, computeNextRun(sub.frequency));
      sent++;
      console.log(`[deliver] sent → ${sub.email} (${label})`);
    } catch (err) {
      failed++;
      await markError(sql, sub.id, err.message).catch(() => {});
      console.error(`[deliver] FAILED → ${sub.email} (${label}): ${err.message}`);
    }
  }
  console.log(`[deliver] done: ${sent} sent, ${failed} failed`);
  if (failed > 0 && sent === 0 && due.length > 0) process.exit(1); // total failure → surface in CI
}

main().catch((e) => { console.error('[deliver] fatal:', e.message); process.exit(1); });
