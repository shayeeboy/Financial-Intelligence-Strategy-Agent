// R4 — Freshness SLA. Pure, deterministic. Given a series' latest ref date and an
// "as of" instant, decide whether we're within one release cycle of the source.
//
// Thresholds are generous (≈ one cadence + a full grace cycle) so the SLA flags
// only CLEAR staleness — the source is ≥2 cycles behind, or a refresh has stopped —
// never the inherent reporting lag of slow series (annual CMHC data is months old
// by design). Everything is derived from real dates; nothing is fabricated.

// Keyed by the snapshot / orchestrator series keys. Thresholds account for the
// fact that StatCan `ref_period` is the period START, plus publication lag, plus the
// gap until the next release — so a healthy "latest" point is legitimately old
// (a Q1 figure is ~8 months past its Jan-1 start before Q2 publishes). The SLA
// fires only when data is clearly a further cycle behind that.
export const SOURCE_CADENCE = {
  debt:    { cadence: 'quarterly',        maxAgeDays: 280 }, // StatCan 38-10-0238
  credit:  { cadence: 'quarterly',        maxAgeDays: 280 },
  cpi:     { cadence: 'monthly',          maxAgeDays: 95  }, // StatCan 18-10-0004
  rent2br: { cadence: 'annual (CMHC RMS)', maxAgeDays: 730 }, // 34-10-0133
  vacancy: { cadence: 'annual (CMHC RMS)', maxAgeDays: 730 }, // 34-10-0127
  policy:  { cadence: 'as-announced',     maxAgeDays: 120 }, // BoC overnight target
  prime:   { cadence: 'as-announced',     maxAgeDays: 120 },
  mtg5:    { cadence: 'weekly',           maxAgeDays: 45  }, // BoC conventional 5-yr
};

/**
 * @param {string} key           series key (see SOURCE_CADENCE)
 * @param {string|null} latestDate  latest ref period / date (ISO-ish)
 * @param {Date|string} [asOf]    instant to measure against (Date.now, or snapshot run_at)
 * @returns {{ key, cadence, ageDays, maxAgeDays, withinSla }}  withinSla is null when unknown
 */
export function assessFreshness(key, latestDate, asOf = new Date()) {
  const meta = SOURCE_CADENCE[key] || null;
  const base = { key, cadence: meta?.cadence ?? null, ageDays: null, maxAgeDays: meta?.maxAgeDays ?? null, withinSla: null };
  if (!meta || !latestDate) return base;
  const t = Date.parse(latestDate);
  const now = asOf instanceof Date ? asOf.getTime() : Date.parse(asOf);
  if (Number.isNaN(t) || Number.isNaN(now)) return base;
  const ageDays = Math.max(0, Math.floor((now - t) / 86_400_000));
  return { ...base, ageDays, withinSla: ageDays <= meta.maxAgeDays };
}

/**
 * Roll up freshness across series (ignores entries we couldn't score).
 * @returns {{ total, withinSla, stale: string[] }}
 */
export function summarizeFreshness(entries) {
  const scored = entries.filter((e) => e.withinSla != null);
  return {
    total: scored.length,
    withinSla: scored.filter((e) => e.withinSla).length,
    stale: scored.filter((e) => e.withinSla === false).map((e) => e.key),
  };
}
