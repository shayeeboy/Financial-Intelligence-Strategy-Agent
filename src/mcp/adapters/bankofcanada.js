// Bank of Canada — Valet API adapter.
// Docs: https://www.bankofcanada.ca/valet/docs
// No API key required. Returns dated observations for named series.

import { fetchJson } from '../../lib/http.js';

const BASE = 'https://www.bankofcanada.ca/valet';

// Curated, business-relevant series. These map macro rates to the discretionary
// financial bandwidth of Canadian households (borrowing cost, savings yield, FX).
export const BOC_SERIES = {
  policy_rate: { id: 'V39079', label: 'Target for the overnight rate (%)' },
  prime_rate: { id: 'V80691311', label: 'Chartered bank prime lending rate (%)' },
  corra: { id: 'AVG.INTWO', label: 'CORRA — Canadian Overnight Repo Rate Average (%)' },
  cad_usd: { id: 'FXUSDCAD', label: 'USD/CAD daily exchange rate' },
  '5yr_mortgage': { id: 'V80691335', label: 'Conventional 5-year mortgage rate (%)' },
};

/**
 * Fetch the most recent N observations for a curated series key or a raw series id.
 * @param {string} seriesKeyOrId
 * @param {number} [recent=6]
 */
export async function fetchSeries(seriesKeyOrId, recent = 6) {
  const known = BOC_SERIES[seriesKeyOrId];
  const seriesId = known ? known.id : seriesKeyOrId;
  const url = `${BASE}/observations/${encodeURIComponent(seriesId)}/json?recent=${recent}`;
  const data = await fetchJson(url);

  const observations = (data.observations || []).map((o) => ({
    date: o.d,
    value: o[seriesId] ? Number(o[seriesId].v) : null,
  }));

  const detail = data.seriesDetail?.[seriesId] || {};
  return {
    source: 'Bank of Canada — Valet API',
    series_id: seriesId,
    label: known?.label || detail.description || seriesId,
    url: `https://www.bankofcanada.ca/valet/observations/${seriesId}`,
    latest: observations.at(-1) || null,
    observations,
    retrieved_at: new Date().toISOString(),
  };
}

/** Convenience: pull the headline household-facing rate environment in one call. */
export async function fetchRateEnvironment() {
  const keys = ['policy_rate', 'prime_rate', '5yr_mortgage'];
  const results = await Promise.all(keys.map((k) => fetchSeries(k, 2).catch((e) => ({ error: e.message, key: k }))));
  return Object.fromEntries(keys.map((k, i) => [k, results[i]]));
}
