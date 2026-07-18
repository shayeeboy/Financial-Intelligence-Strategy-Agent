// Offline unit-acceptance tests — no network, no live APIs.
// Run: npm run check   (node --test)
//
// Each test maps to an acceptance criterion documented in the README.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { pct, money, yoy, annualize, requiredIncome, baselineYears } from '../src/lib/metrics.js';
import { resolveCoordinate, CONCEPT_VECTORS, GEO_ALIASES } from '../src/mcp/adapters/statcan.js';
import { BOC_SERIES } from '../src/mcp/adapters/bankofcanada.js';
import { compileStrategyBrief } from '../src/mcp/tools/compile_strategy_brief.js';

// --- Metric helpers ---------------------------------------------------------
test('AC-M1: pct/money format Canadian figures, null-safe', () => {
  assert.equal(pct(179.55), '179.55%');
  assert.equal(money(2045), '$2,045');
  assert.equal(pct(null), 'n/a');
  assert.equal(money(undefined), 'n/a');
});

test('AC-M2: yoy computes same-period year-over-year change', () => {
  const trend = [
    { ref_period: '2024-05-01', value: 100 },
    { ref_period: '2025-05-01', value: 105 },
    { ref_period: '2026-05-01', value: 110 },
  ];
  // latest 2026 vs prior-year 2025: (110-105)/105 = 4.76%
  assert.ok(Math.abs(yoy(trend) - 4.7619) < 0.01);
  assert.equal(yoy([{ ref_period: '2026-01-01', value: 1 }]), null); // too few points
});

test('AC-M3: annualize + 30% required-income rule', () => {
  assert.equal(annualize(2045), 24540);
  assert.equal(requiredIncome(24540), 81800); // 24540 / 0.30
  assert.equal(requiredIncome(null), null);
});

test('AC-M4: baselineYears drives the <3yr Low-Confidence guardrail', () => {
  const threeYrPlus = [{ ref_period: '2022-01-01' }, { ref_period: '2026-01-01' }];
  const underThree = [{ ref_period: '2025-01-01' }, { ref_period: '2026-01-01' }];
  assert.equal(baselineYears(threeYrPlus), 4);
  assert.ok(baselineYears(threeYrPlus) >= 3, 'passes guardrail');
  assert.ok(baselineYears(underThree) < 3, 'flagged Low Confidence');
});

// --- StatCan coordinate resolver -------------------------------------------
const FAKE_META = {
  dimension: [
    { dimensionPositionId: 1, dimensionNameEn: 'Geography', member: [
      { memberId: 1, memberNameEn: 'Canada' },
      { memberId: 125, memberNameEn: 'Toronto, Ontario' },
      { memberId: 184, memberNameEn: 'Vancouver, British Columbia' },
    ] },
    { dimensionPositionId: 2, dimensionNameEn: 'Type of unit', member: [
      { memberId: 1, memberNameEn: 'Total, all unit types' },
      { memberId: 3, memberNameEn: 'Two bedroom units' },
    ] },
  ],
};

test('AC-C1: resolveCoordinate matches members and zero-fills to 10 parts', () => {
  const { coordinate, resolved } = resolveCoordinate(FAKE_META, ['Toronto', 'Two bedroom']);
  assert.equal(coordinate, '125.3.0.0.0.0.0.0.0.0');
  assert.equal(resolved[0].member, 'Toronto, Ontario');
  assert.equal(resolved[1].member, 'Two bedroom units');
});

test('AC-C2: resolveCoordinate falls back to a Total/first member when unmatched', () => {
  const { resolved } = resolveCoordinate(FAKE_META, ['Toronto', null]);
  assert.match(resolved[1].member, /^Total/); // picked "Total, all unit types"
});

test('AC-C3: resolveCoordinate guards against a wrong-geography match', () => {
  // "Calgary" is not in FAKE_META → falls back to Canada (member 1), never a silent wrong CMA.
  const { resolved } = resolveCoordinate(FAKE_META, ['Calgary', 'Two bedroom']);
  assert.equal(resolved[0].member, 'Canada');
});

// --- Registries are well-formed --------------------------------------------
test('AC-R1: curated registries have the required shape', () => {
  for (const [k, v] of Object.entries(CONCEPT_VECTORS)) {
    assert.ok(Number.isInteger(v.vectorId), `${k} has an integer vectorId`);
    assert.ok(v.label && v.table_id, `${k} has label + table_id`);
  }
  for (const [k, v] of Object.entries(BOC_SERIES)) {
    assert.ok(v.id && v.label, `BoC ${k} has id + label`);
  }
  assert.ok(GEO_ALIASES.National && GEO_ALIASES.ON, 'geo aliases present');
});

// --- Brief compiler (filesystem, isolated temp dir) ------------------------
test('AC-B1: compile_strategy_brief rejects unsafe filenames and missing fields', async () => {
  const base = { target_demographic: 'X', banking_product_focus: 'Y', markdown_body: '# Z' };
  await assert.rejects(() => compileStrategyBrief({ ...base, filename: '../evil.md' }), /Invalid filename/);
  await assert.rejects(() => compileStrategyBrief({ ...base, filename: 'note.txt' }), /Invalid filename/);
  await assert.rejects(
    () => compileStrategyBrief({ filename: 'ok.md', target_demographic: '', banking_product_focus: 'Y', markdown_body: 'Z' }),
    /missing required field/
  );
});

test('AC-B2: compile_strategy_brief writes the brief and appends a matrix row', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fisa-brief-'));
  try {
    const res = await compileStrategyBrief({
      filename: 'test_brief.md',
      target_demographic: 'Gen Z, BC',
      banking_product_focus: 'Digital Payments',
      markdown_body: '# Test\nbody',
      geography: 'BC',
      confidence: 'High',
      briefsDir: dir,
    });
    const brief = await fs.readFile(path.join(dir, 'test_brief.md'), 'utf8');
    const index = await fs.readFile(path.join(dir, 'master_index.md'), 'utf8');
    assert.match(brief, /# Test/);
    assert.match(index, /\| Date \(UTC\) \|/); // header created
    assert.match(index, /Gen Z, BC .*Digital Payments.*\[test_brief\.md\]/);
    assert.ok(res.bytes > 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('AC-B3: re-compiling the same filename de-duplicates the matrix row', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fisa-brief-'));
  try {
    const args = {
      filename: 'dupe.md',
      target_demographic: 'D',
      banking_product_focus: 'P',
      markdown_body: 'v1',
      briefsDir: dir,
    };
    await compileStrategyBrief(args);
    await compileStrategyBrief({ ...args, markdown_body: 'v2' });
    const index = await fs.readFile(path.join(dir, 'master_index.md'), 'utf8');
    const rows = index.split('\n').filter((l) => l.includes('](./dupe.md)'));
    assert.equal(rows.length, 1, 'exactly one row for the filename');
    const brief = await fs.readFile(path.join(dir, 'dupe.md'), 'utf8');
    assert.match(brief, /v2/); // content overwritten
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

// ============================================================================
// Web brief generator (browser modules under web/js) — pure logic, Node-testable
// ============================================================================
import { CMAS, PROVINCES, DEMOGRAPHICS, PRODUCTS, BEDROOMS } from '../web/js/catalog.js';
import { composeBrief } from '../web/js/compose.js';
import { renderMarkdown } from '../web/js/markdown.js';
import * as webMetrics from '../web/js/metrics.js';

// Deterministic mock series with ≥3yr baseline so confidence resolves High.
const mkTrend = (v) => ({ latest: { ref_period: '2026-01-01', value: v }, points: [
  { ref_period: '2022-01-01', value: v * 0.9 }, { ref_period: '2026-01-01', value: v } ] });
const mkRate = (v) => ({ latest: { date: '2026-07-10', value: v }, points: [{ date: '2026-07-10', value: v }] });
const MOCK = {
  debt: mkTrend(179.55), credit: mkTrend(171.15), cpi: mkTrend(169.6),
  rent: mkTrend(2045), vacancy: mkTrend(3),
  policy: mkRate(2.25), prime: mkRate(4.45), mtg5: mkRate(6.09),
};

test('AC-W1: composeBrief emits all mandated sections + a Financial Services Implication in each', () => {
  const { markdown, confidence } = composeBrief(
    { cmaKey: 'toronto', bedroom: 'Two bedroom', demographicKey: 'newcomers', productKey: 'newcomer_credit' }, MOCK);
  for (const h of ['## Executive Summary', '## Demographic Profile & Financial Status',
    '## Structural Impediments & Lifestyle Choices', '## Product Innovation Opportunities', '## Sources & Methodology']) {
    assert.ok(markdown.includes(h), `missing section: ${h}`);
  }
  assert.ok((markdown.match(/Financial Services Implication/g) || []).length >= 4, 'needs ≥4 implications');
  assert.equal(confidence, 'High');
});

test('AC-W2: composeBrief works for every demographic × product combo, no template holes', () => {
  let n = 0;
  for (const demographicKey of Object.keys(DEMOGRAPHICS)) {
    for (const productKey of Object.keys(PRODUCTS)) {
      const { markdown } = composeBrief({ cmaKey: 'vancouver', bedroom: 'Two bedroom', demographicKey, productKey }, MOCK);
      assert.ok(!/undefined|NaN|\[object/.test(markdown), `template hole in ${demographicKey}/${productKey}`);
      assert.ok(markdown.includes('Financial Services Implication'));
      n++;
    }
  }
  assert.equal(n, Object.keys(DEMOGRAPHICS).length * Object.keys(PRODUCTS).length);
});

test('AC-W3: low-baseline series flip the web brief to Low Confidence', () => {
  const thin = { ...MOCK, rent: { latest: { ref_period: '2026-01-01', value: 2045 },
    points: [{ ref_period: '2025-01-01', value: 2000 }, { ref_period: '2026-01-01', value: 2045 }] } };
  const { confidence } = composeBrief(
    { cmaKey: 'toronto', bedroom: 'Two bedroom', demographicKey: 'genz', productKey: 'savings' }, thin);
  assert.equal(confidence, 'Low Confidence');
});

test('AC-W4: catalog integrity — CMAs, demographics, products are well-formed', () => {
  const provKeys = new Set(PROVINCES.map((p) => p.key));
  for (const [k, c] of Object.entries(CMAS)) {
    assert.ok(provKeys.has(c.province), `${k}: valid province`);
    for (const b of BEDROOMS) assert.match(c.beds[b], /^\d+(\.\d+){9}$/, `${k}/${b}: 10-part coord`);
    assert.match(c.vacancyCoord, /^\d+(\.\d+){9}$/, `${k}: vacancy coord`);
  }
  for (const d of Object.values(DEMOGRAPHICS)) assert.ok(d.label && d.profile && d.posture && d.impediments.length);
  for (const p of Object.values(PRODUCTS)) assert.ok(p.label && p.category && p.opportunities.length >= 3);
});

test('AC-W5: markdown renderer handles headings, tables, lists, bold, links', () => {
  const html = renderMarkdown('# T\n\n## S\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n- **x**\n\n[g](http://x)');
  assert.match(html, /<h1>T<\/h1>/);
  assert.match(html, /<table><thead><tr><th>A<\/th>/);
  assert.match(html, /<td>1<\/td>/);
  assert.match(html, /<li><strong>x<\/strong><\/li>/);
  assert.match(html, /<a href="http:\/\/x"[^>]*>g<\/a>/);
});

test('AC-W6: web metrics match src/lib metrics (no drift)', () => {
  assert.equal(webMetrics.pct(179.55), pct(179.55));
  assert.equal(webMetrics.money(2045), money(2045));
  assert.equal(webMetrics.annualize(2045), annualize(2045));
  assert.equal(webMetrics.requiredIncome(24540), requiredIncome(24540));
  const trend = [{ ref_period: '2025-01-01', value: 100 }, { ref_period: '2026-01-01', value: 110 }];
  assert.equal(webMetrics.yoy(trend), yoy(trend));
  assert.equal(webMetrics.baselineYears(trend), baselineYears(trend));
});

// ============================================================================
// Scheduled email delivery (src/email/*) — pure logic + fetch-mocked send
// ============================================================================
import { validateSubscription, computeNextRun, describeSelection, FREQUENCIES } from '../src/email/subscription.js';
import { buildConfirmEmail, buildBriefEmail } from '../src/email/template.js';
import { sendEmail } from '../src/email/send.js';
import * as emailDb from '../src/email/db.js'; // import-only: confirms the Neon driver resolves

const VALID_SUB = { email: 'Analyst@Example.com', cma_key: 'toronto', bedroom: 'Two bedroom',
  demographic: 'newcomers', product: 'newcomer_credit', frequency: 'weekly' };

test('AC-E1: validateSubscription accepts valid input, rejects bad fields', () => {
  const ok = validateSubscription(VALID_SUB);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.email, 'analyst@example.com'); // normalized lower-case
  assert.equal(validateSubscription({ ...VALID_SUB, email: 'nope' }).ok, false);
  assert.equal(validateSubscription({ ...VALID_SUB, cma_key: 'atlantis' }).ok, false);
  assert.equal(validateSubscription({ ...VALID_SUB, demographic: 'aliens' }).ok, false);
  assert.equal(validateSubscription({ ...VALID_SUB, product: 'crypto' }).ok, false);
  assert.equal(validateSubscription({ ...VALID_SUB, frequency: 'hourly' }).ok, false);
});

test('AC-E2: computeNextRun advances weekly/monthly and clamps month overflow', () => {
  const base = new Date('2026-01-31T12:00:00Z');
  assert.equal(computeNextRun('weekly', base).toISOString().slice(0, 10), '2026-02-07');
  // Jan 31 + 1 month must not roll into March — clamp to end of Feb.
  const m = computeNextRun('monthly', base);
  assert.equal(m.getUTCMonth(), 1); // February (0-indexed)
  assert.throws(() => computeNextRun('yearly', base));
  assert.deepEqual(FREQUENCIES, ['weekly', 'monthly']);
});

test('AC-E3: buildConfirmEmail includes confirm + unsubscribe links and escapes', () => {
  const label = describeSelection(VALID_SUB);
  const e = buildConfirmEmail({ selectionLabel: label, confirmUrl: 'https://w/api/confirm?t=abc', unsubUrl: 'https://w/api/unsubscribe?t=xyz' });
  assert.match(e.subject, /Confirm/);
  assert.match(e.html, /api\/confirm\?t=abc/);
  assert.match(e.html, /api\/unsubscribe\?t=xyz/);
  assert.match(e.text, /Confirm: https:\/\/w\/api\/confirm/);
});

test('AC-E4: buildBriefEmail renders brief markdown with inline table styles + unsub', () => {
  const md = '# Strategic Brief — Test\n\n## Executive Summary\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n';
  const e = buildBriefEmail({ selectionLabel: 'x', briefMarkdown: md, unsubUrl: 'https://w/api/unsubscribe?t=z' });
  assert.match(e.subject, /Strategic Brief — Test/);      // subject from H1
  assert.match(e.html, /<table style="/);                  // inlined for email clients
  assert.match(e.html, /api\/unsubscribe\?t=z/);           // unsubscribe present
  assert.equal(e.unsubUrl, 'https://w/api/unsubscribe?t=z');
});

test('AC-E5: sendEmail posts to Resend with auth + one-click unsubscribe header', async () => {
  const calls = [];
  const orig = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ id: 'eml_1' }) }; };
  try {
    const r = await sendEmail({ apiKey: 'rk_test', from: 'a@b', to: 'c@d', subject: 's', html: '<p>h</p>', unsubUrl: 'https://w/u' });
    assert.equal(r.id, 'eml_1');
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.match(calls[0].init.headers.Authorization, /Bearer rk_test/);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.headers['List-Unsubscribe'], '<https://w/u>');
    assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  } finally { globalThis.fetch = orig; }
  await assert.rejects(() => sendEmail({ from: 'a', to: 'b', subject: 's', html: 'h' }), /missing Resend API key/);
});

test('AC-E6: db module exports the expected query helpers', () => {
  for (const fn of ['client', 'insertPending', 'confirmByToken', 'unsubscribeByToken', 'dueSubscriptions', 'markSent', 'countRecentByEmail']) {
    assert.equal(typeof emailDb[fn], 'function', `db.${fn} exported`);
  }
});
