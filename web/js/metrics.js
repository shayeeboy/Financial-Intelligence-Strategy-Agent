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
