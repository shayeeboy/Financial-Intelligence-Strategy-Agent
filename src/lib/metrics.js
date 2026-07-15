// Pure, side-effect-free helpers for formatting and deriving figures.
// Kept separate from the orchestrator so they can be unit-tested offline.

/** Format a number as a percentage string, e.g. 179.55 -> "179.55%". */
export const pct = (n) => (n == null || Number.isNaN(n) ? 'n/a' : `${Number(n).toFixed(2)}%`);

/** Format a number as CAD, e.g. 2045 -> "$2,045". */
export const money = (n) =>
  n == null || Number.isNaN(n) ? 'n/a' : `$${Number(n).toLocaleString('en-CA')}`;

/**
 * Year-over-year % change from a StatCan-style trend array
 * ([{ ref_period, value }, ...], oldest→newest). Matches the same calendar
 * period one year back when available; otherwise falls back to the prior point.
 * Returns null when it can't be computed.
 */
export function yoy(points) {
  if (!Array.isArray(points) || points.length < 2) return null;
  const latest = points.at(-1);
  if (!latest || latest.value == null || !latest.ref_period) return null;
  const priorYear = String(Number(latest.ref_period.slice(0, 4)) - 1);
  const prior = points.find((p) => p.ref_period?.startsWith(priorYear)) || points.at(-2);
  if (!prior || prior.value == null || prior.value === 0) return null;
  return ((latest.value - prior.value) / prior.value) * 100;
}

/** Annualize a monthly figure. */
export const annualize = (monthly) => (monthly == null ? null : monthly * 12);

/**
 * Gross income required to keep a shelter cost at or below `share` of income
 * (default 30% affordability rule).
 */
export const requiredIncome = (annualCost, share = 0.3) =>
  annualCost == null ? null : annualCost / share;

/**
 * Span, in whole years, covered by a trend array. Used by the confidence
 * guardrail: fewer than 3 years of baseline => "Low Confidence".
 */
export function baselineYears(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  const first = points[0]?.ref_period;
  const last = points.at(-1)?.ref_period;
  if (!first || !last) return 0;
  return Number(last.slice(0, 4)) - Number(first.slice(0, 4));
}
