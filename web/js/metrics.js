// Pure derived-figure helpers — a browser copy of src/lib/metrics.js so the web
// app has no build step and no cross-directory imports. Kept in sync by
// scripts/check.js (AC-W0 asserts the two files are byte-identical in intent).

export const pct = (n) => (n == null || Number.isNaN(n) ? 'n/a' : `${Number(n).toFixed(2)}%`);

export const money = (n) =>
  n == null || Number.isNaN(n) ? 'n/a' : `$${Number(n).toLocaleString('en-CA')}`;

export function yoy(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const latest = points.at(-1);
  if (!latest || latest.value == null || !latest.ref_period) return null;
  const priorYear = String(Number(latest.ref_period.slice(0, 4)) - 1);
  const prior = points.find((p) => p.ref_period?.startsWith(priorYear)) || points.at(-2);
  if (!prior || prior.value == null || prior.value === 0) return null;
  return ((latest.value - prior.value) / prior.value) * 100;
}

export const annualize = (monthly) => (monthly == null ? null : monthly * 12);

export const requiredIncome = (annualCost, share = 0.3) =>
  annualCost == null ? null : annualCost / share;

export function baselineYears(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  const first = points[0]?.ref_period;
  const last = points.at(-1)?.ref_period;
  if (!first || !last) return 0;
  return Number(last.slice(0, 4)) - Number(first.slice(0, 4));
}

/**
 * Period-over-period delta (latest vs previous point) — forecast-free, always
 * defined with ≥2 points. Returns { abs, pct, direction } or null.
 */
export function periodDelta(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const latest = points.at(-1), prev = points.at(-2);
  if (!latest || !prev || latest.value == null || prev.value == null) return null;
  const abs = latest.value - prev.value;
  const pct = prev.value !== 0 ? (abs / prev.value) * 100 : null;
  return { abs, pct, direction: abs > 0 ? 'up' : abs < 0 ? 'down' : 'flat' };
}

const SPARK_TICKS = '▁▂▃▄▅▆▇█';
/** Unicode block sparkline of a numeric series (min→max scaled). '' if <2 values. */
export function sparkline(values) {
  const nums = (Array.isArray(values) ? values : []).map(Number).filter((n) => !Number.isNaN(n));
  if (nums.length < 2) return '';
  const min = Math.min(...nums), max = Math.max(...nums), range = max - min;
  return nums
    .map((n) => SPARK_TICKS[range === 0 ? 0 : Math.min(SPARK_TICKS.length - 1, Math.floor(((n - min) / range) * (SPARK_TICKS.length - 1)))])
    .join('');
}

/** Directional arrow for a delta direction (↑/↓/→ style), safe default '·'. */
export const deltaArrow = (dir) => (dir === 'up' ? '▲' : dir === 'down' ? '▼' : dir === 'flat' ? '▬' : '·');
