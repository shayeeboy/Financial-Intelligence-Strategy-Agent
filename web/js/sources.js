// Browser data adapters — call the public Canadian open-data APIs directly from
// the page (all three send `Access-Control-Allow-Origin: *`, so no backend is
// needed). Faithful browser ports of src/mcp/adapters/*. Uses global fetch.

const STATCAN = 'https://www150.statcan.gc.ca/t1/wds/rest';
const BOC = 'https://www.bankofcanada.ca/valet';

async function getJson(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const postJson = (url, body) =>
  getJson(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function normVector(obj) {
  if (!obj || obj.responseStatusCode !== 0) return null;
  const points = (obj.vectorDataPoint || []).map((p) => ({ ref_period: p.refPer, value: p.value }));
  return { vector_id: obj.vectorId, product_id: obj.productId, latest: points.at(-1) || null, points };
}

// --- Statistics Canada -------------------------------------------------------
export async function statcanVector(vectorId, latestN = 12) {
  const res = await postJson(`${STATCAN}/getDataFromVectorsAndLatestNPeriods`, [
    { vectorId: Number(vectorId), latestN },
  ]);
  const n = normVector(res[0]?.object);
  if (!n) throw new Error(`StatCan vector ${vectorId} returned no data`);
  return n;
}

export async function statcanCoord(productId, coordinate, latestN = 6) {
  const pid = Number(String(productId).replace(/-/g, ''));
  const res = await postJson(`${STATCAN}/getDataFromCubePidCoordAndLatestNPeriods`, [
    { productId: pid, coordinate, latestN },
  ]);
  const n = normVector(res[0]?.object);
  if (!n) throw new Error(`StatCan ${pid}/${coordinate} returned no data`);
  return n;
}

// --- Bank of Canada ----------------------------------------------------------
export async function bocSeries(seriesId, recent = 2) {
  const data = await getJson(`${BOC}/observations/${encodeURIComponent(seriesId)}/json?recent=${recent}`);
  const obs = (data.observations || []).map((o) => ({ date: o.d, value: o[seriesId] ? Number(o[seriesId].v) : null }));
  return { series_id: seriesId, latest: obs.at(-1) || null, observations: obs };
}

// Curated identifiers (mirror of the Node adapters' registries).
export const VEC = {
  debt_to_disposable_income: 1038036698,
  consumer_credit_mortgage_to_income: 1038036699,
  cpi_all_items: 41690973,
};
export const BOC_ID = {
  policy_rate: 'V39079',
  prime_rate: 'V80691311',
  mortgage_5yr: 'V80691335',
};
export const RENT_PID = '34100133';
export const VACANCY_PID = '34100127';
