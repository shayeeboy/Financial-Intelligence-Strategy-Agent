// Statistics Canada — Web Data Service (WDS) adapter.
// Docs: https://www.statcan.gc.ca/en/developers/wds/user-guide
// No API key required. All endpoints are POST with a JSON array body.

import { postJson } from '../../lib/http.js';

const BASE = 'https://www150.statcan.gc.ca/t1/wds/rest';

// Province / region -> the geography member label fragment used by StatCan cubes.
// Used to pick the right coordinate member when resolving a table by geography.
export const GEO_ALIASES = {
  National: ['Canada'],
  ON: ['Ontario'],
  QC: ['Quebec'],
  BC: ['British Columbia'],
  AB: ['Alberta'],
  MB: ['Manitoba'],
  SK: ['Saskatchewan'],
  Atlantic: ['Nova Scotia', 'New Brunswick', 'Newfoundland', 'Prince Edward Island'],
};

// Curated registry: business concept -> a verified StatCan vector.
// Vectors are validated by scripts/smoke.js against the live WDS before use.
// Passing a raw numeric table_id/vectorId is also supported (see queryFinancialBehaviour).
// Each vector below is validated against live WDS by scripts/smoke.js.
export const CONCEPT_VECTORS = {
  // Household sector credit market summary (Table 38-10-0238), National
  debt_to_disposable_income: {
    vectorId: 1038036698,
    table_id: '38100238',
    label: 'Household credit market debt to disposable income (%)',
  },
  consumer_credit_mortgage_to_income: {
    vectorId: 1038036699,
    table_id: '38100238',
    label: 'Consumer credit and mortgage liabilities to disposable income (%)',
  },
  // CPI all-items (Table 18-10-0004) — cost-of-living pressure proxy, National
  cpi_all_items: {
    vectorId: 41690973,
    table_id: '18100004',
    label: 'Consumer Price Index, all-items (2002=100), Canada',
  },
};

async function callWds(endpoint, payload) {
  const out = await postJson(`${BASE}/${endpoint}`, payload);
  return Array.isArray(out) ? out : [out];
}

/** Full cube (table) metadata: dimensions, members, title, coverage window. */
export async function getCubeMetadata(productId) {
  const pid = String(productId).replace(/-/g, '');
  const res = await callWds('getCubeMetadata', [{ productId: Number(pid) }]);
  const obj = res[0]?.object;
  if (!obj) throw new Error(`No metadata for productId ${pid}`);
  return obj;
}

/** Latest N data points for one or more vectors. */
export async function getVectorData(vectorIds, latestN = 5) {
  const ids = (Array.isArray(vectorIds) ? vectorIds : [vectorIds]).map((v) => ({
    vectorId: Number(v),
    latestN,
  }));
  const res = await callWds('getDataFromVectorsAndLatestNPeriods', ids);
  return res.map((r) => normalizeVector(r.object)).filter(Boolean);
}

function normalizeVector(obj) {
  if (!obj || obj.responseStatusCode !== 0) return null;
  const points = (obj.vectorDataPoint || []).map((p) => ({
    ref_period: p.refPer,
    value: p.value,
    release_time: p.releaseTime,
  }));
  return {
    vector_id: obj.vectorId,
    product_id: obj.productId,
    coordinate: obj.coordinate,
    latest: points.at(-1) || null,
    points,
  };
}

/**
 * Latest N data points for a specific cube coordinate (dimension-member path).
 */
export async function getCoordData(productId, coordinate, latestN = 5) {
  const pid = Number(String(productId).replace(/-/g, ''));
  const res = await callWds('getDataFromCubePidCoordAndLatestNPeriods', [
    { productId: pid, coordinate, latestN },
  ]);
  const norm = normalizeVector(res[0]?.object);
  if (!norm) {
    throw new Error(
      `No data for pid ${pid} coordinate ${coordinate} (status ${res[0]?.object?.responseStatusCode})`
    );
  }
  return norm;
}

/**
 * Build a 10-part cube coordinate from human selectors.
 * @param {object} meta - result of getCubeMetadata.
 * @param {Array<string|RegExp|null>} selectors - one entry per dimension (in
 *   position order). A string/RegExp picks the first member whose English name
 *   matches; null/undefined falls back to a "Total/All" member, else member 1.
 * @returns {{coordinate: string, resolved: Array}}
 */
export function resolveCoordinate(meta, selectors = []) {
  const dims = [...(meta.dimension || [])].sort(
    (a, b) => a.dimensionPositionId - b.dimensionPositionId
  );
  const parts = [];
  const resolved = [];
  for (let i = 0; i < dims.length; i++) {
    const members = dims[i].member || [];
    const sel = selectors[i];
    let member;
    if (sel != null) {
      const rx = sel instanceof RegExp ? sel : new RegExp(escapeRx(String(sel)), 'i');
      member = members.find((m) => rx.test(m.memberNameEn));
    }
    if (!member) {
      member =
        members.find((m) => /^(total|all)\b/i.test(m.memberNameEn)) || members[0];
    }
    if (!member) throw new Error(`Dimension "${dims[i].dimensionNameEn}" has no members`);
    parts.push(member.memberId);
    resolved.push({ dimension: dims[i].dimensionNameEn, member: member.memberNameEn });
  }
  while (parts.length < 10) parts.push(0);
  return { coordinate: parts.join('.'), resolved };
}

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Primary tool-facing query. Resolves a curated concept OR a raw vector/table id
 * into recent financial-behaviour data.
 *
 * @param {object} args
 * @param {string} [args.concept]   - key in CONCEPT_VECTORS.
 * @param {string} [args.table_id]  - 8-digit StatCan productId (used for provenance).
 * @param {number} [args.vectorId]  - explicit vector override.
 * @param {string} [args.province]  - one of GEO_ALIASES keys (provenance/labelling).
 * @param {number} [args.latestN=8]
 */
export async function queryFinancialBehaviour(args = {}) {
  const { concept, table_id, vectorId, province = 'National', latestN = 8 } = args;

  let vec = vectorId;
  let meta = concept ? CONCEPT_VECTORS[concept] : null;
  if (!vec && meta) vec = meta.vectorId;

  if (!vec) {
    throw new Error(
      'queryFinancialBehaviour needs a known `concept`, an explicit `vectorId`, ' +
        `or use getCubeMetadata(table_id) to resolve a coordinate. ` +
        `Known concepts: ${Object.keys(CONCEPT_VECTORS).join(', ')}`
    );
  }

  const [data] = await getVectorData(vec, latestN);
  if (!data) throw new Error(`No data returned for vector ${vec}`);

  return {
    source: 'Statistics Canada — Web Data Service (WDS)',
    concept: concept || null,
    label: meta?.label || `Vector ${vec}`,
    province,
    table_id: meta?.table_id || (table_id ? String(table_id).replace(/-/g, '') : String(data.product_id)),
    source_url: `https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=${data.product_id}`,
    vector_id: data.vector_id,
    latest: data.latest,
    trend: data.points,
    n_periods: data.points.length,
    retrieved_at: new Date().toISOString(),
  };
}
