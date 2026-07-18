// Pure subscription logic — validation + scheduling. No I/O, no runtime globals.
// Shared by the Cloudflare Worker, the cron delivery script, and the tests.

import { CMAS, DEMOGRAPHICS, PRODUCTS, BEDROOMS } from '../../web/js/catalog.js';

export const FREQUENCIES = ['weekly', 'monthly'];

// Deliberately simple, RFC-5322-adjacent check. We double-opt-in anyway, so a
// bad address just never confirms — this only blocks obvious garbage/injection.
const EMAIL_RE = /^[^\s@"']+@[^\s@"']+\.[^\s@"']{2,}$/;

export const normalizeEmail = (e) => String(e ?? '').trim().toLowerCase();

/**
 * Validate an incoming subscription request against the live catalog.
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function validateSubscription(input = {}) {
  const email = normalizeEmail(input.email);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, error: 'A valid email address is required.' };
  }
  const cma_key = String(input.cma_key ?? '');
  if (!CMAS[cma_key]) return { ok: false, error: `Unknown city "${cma_key}".` };

  const bedroom = String(input.bedroom ?? 'Two bedroom');
  if (!BEDROOMS.includes(bedroom)) return { ok: false, error: `Unknown rent basis "${bedroom}".` };

  const demographic = String(input.demographic ?? '');
  if (!DEMOGRAPHICS[demographic]) return { ok: false, error: `Unknown demographic "${demographic}".` };

  const product = String(input.product ?? '');
  if (!PRODUCTS[product]) return { ok: false, error: `Unknown product "${product}".` };

  const frequency = String(input.frequency ?? '');
  if (!FREQUENCIES.includes(frequency)) return { ok: false, error: `Frequency must be one of: ${FREQUENCIES.join(', ')}.` };

  return { ok: true, value: { email, cma_key, bedroom, demographic, product, frequency } };
}

/**
 * Next delivery instant = `from` + one interval (rolling schedule from confirmation).
 * @param {'weekly'|'monthly'} frequency
 * @param {Date} [from=now]
 * @returns {Date}
 */
export function computeNextRun(frequency, from = new Date()) {
  const d = new Date(from.getTime());
  if (frequency === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (frequency === 'monthly') {
    const day = d.getUTCDate();
    d.setUTCMonth(d.getUTCMonth() + 1);
    // Guard month-length overflow (e.g. Jan 31 -> Feb): clamp to last day.
    if (d.getUTCDate() < day) d.setUTCDate(0);
  } else {
    throw new Error(`Unknown frequency: ${frequency}`);
  }
  return d;
}

/** Human label for a selection, used in emails and confirmation pages. */
export function describeSelection(sel) {
  const cma = CMAS[sel.cma_key]?.label ?? sel.cma_key;
  const demo = DEMOGRAPHICS[sel.demographic]?.label ?? sel.demographic;
  const prod = PRODUCTS[sel.product]?.label ?? sel.product;
  return `${prod} · ${demo} · ${cma} (${sel.frequency})`;
}
