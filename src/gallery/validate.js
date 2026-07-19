// Pure validation + labelling for gallery entries. No I/O.
// Shared by the Cloudflare Worker and the tests.

import { CMAS, DEMOGRAPHICS, PRODUCTS, BEDROOMS } from '../../web/js/catalog.js';

const CONFIDENCE = ['High', 'Low Confidence'];

/**
 * Validate a "save this brief to the gallery" payload against the live catalog.
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function validateGalleryEntry(input = {}) {
  const cma_key = String(input.cma_key ?? '');
  if (!CMAS[cma_key]) return { ok: false, error: `Unknown city "${cma_key}".` };

  const bedroom = String(input.bedroom ?? 'Two bedroom');
  if (!BEDROOMS.includes(bedroom)) return { ok: false, error: `Unknown rent basis "${bedroom}".` };

  const demographic = String(input.demographic ?? '');
  if (!DEMOGRAPHICS[demographic]) return { ok: false, error: `Unknown demographic "${demographic}".` };

  const product = String(input.product ?? '');
  if (!PRODUCTS[product]) return { ok: false, error: `Unknown product "${product}".` };

  // Confidence is optional; if present it must be a known value.
  let confidence = input.confidence == null ? null : String(input.confidence);
  if (confidence && !CONFIDENCE.includes(confidence)) confidence = null;

  return { ok: true, value: { cma_key, bedroom, demographic, product, confidence } };
}

/** Human label for a gallery entry, e.g. "Mortgages & Home Ownership · Gen Z (18–26) · Toronto". */
export function briefLabel(e) {
  const cma = CMAS[e.cma_key]?.label ?? e.cma_key;
  const demo = DEMOGRAPHICS[e.demographic]?.label ?? e.demographic;
  const prod = PRODUCTS[e.product]?.label ?? e.product;
  return `${prod} · ${demo} · ${cma}`;
}
