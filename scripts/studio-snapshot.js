#!/usr/bin/env node
/**
 * Emit a compact, Studio-shaped snapshot of the Financial Intelligence agent's
 * REAL output, for the AI Product & Leadership Studio to consume live.
 *
 * Reads the committed provenance snapshot (real StatCan / CMHC / Bank of Canada
 * data) and the generated strategic brief, and writes web/studio-snapshot.json —
 * published as-is by the existing Pages workflow at:
 *   https://shayeeboy.github.io/Financial-Intelligence-Strategy-Agent/studio-snapshot.json
 * (GitHub Pages serves it with Access-Control-Allow-Origin: *, so the Studio's
 * browser can fetch it cross-origin with no backend.)
 *
 * Re-run after refreshing the brief:  npm run studio:snapshot
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assessFreshness, summarizeFreshness } from "../src/lib/freshness.js";
import { periodDelta, sparkline } from "../src/lib/metrics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SNAP = path.join(ROOT, "data/raw/snapshot_gta_newcomer_credit_opportunity.json");
const BRIEF = path.join(ROOT, "data/briefs/gta_newcomer_credit_opportunity.md");
const OUT = path.join(ROOT, "web/studio-snapshot.json");

// Display units per indicator key in the provenance snapshot.
const UNITS = { debt: "%", credit: "%", cpi: "index", rent2br: "CAD/mo", vacancy: "%", policy: "%", prime: "%", mtg5: "%" };

// Normalize a series' history to ascending order (oldest → newest). StatCan uses
// `trend` (ascending); Bank of Canada uses `observations` (newest-first) — sorting
// by period makes sparkline/delta direction correct for both.
function normTrend(v) {
  return (v.trend || v.observations || [])
    .map((p) => ({ period: p.ref_period || p.date, value: p.value }))
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
}

// Pull the text of a "## <header>" section up to the next "## " header.
function section(md, header) {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${header}`.toLowerCase());
  if (start === -1) return "";
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) break;
    out.push(lines[i]);
  }
  return out.join("\n").trim();
}

function main() {
  const snap = JSON.parse(fs.readFileSync(SNAP, "utf8"));
  const brief = fs.existsSync(BRIEF) ? fs.readFileSync(BRIEF, "utf8") : "";

  const indicators = Object.entries(snap.data).map(([key, v]) => {
    const latest = v.latest || {};
    const norm = normTrend(v);
    // R6 — forecast-free directional delta (latest vs prior period) + a sparkline.
    const d = periodDelta(norm);
    return {
      key,
      label: v.label || key,
      value: latest.value ?? v.value ?? null,
      unit: UNITS[key] || "",
      source: v.source || "",
      sourceUrl: v.source_url || "",
      refPeriod: latest.ref_period || latest.date || null,
      retrievedAt: v.retrieved_at ?? null,
      nPeriods: v.n_periods ?? null,
      trend: norm.slice(-8),
      delta: d ? { direction: d.direction, pct: d.pct } : null,
      sparkline: sparkline(norm.slice(-16).map((p) => p.value)),
    };
  });

  // Executive summary = first non-empty line of the brief's Executive Summary section.
  const execSection = section(brief, "Executive Summary");
  const executiveSummary =
    execSection.split("\n").map((l) => l.trim()).filter(Boolean)[0] ||
    "Strategy brief for the target segment.";

  // Strategic recommendations = the bolded product-opportunity headlines in the brief.
  const recs = [...brief.matchAll(/^-\s+\*\*(.+?)\*\*/gm)].map((m) => m[1].trim()).slice(0, 6);

  // Observability, derived from the real provenance snapshot only. This agent is a
  // static data pull with no request telemetry, so there is NO latency/cost/error —
  // don't fabricate any. What IS honest: how many sources/indicators, when data was
  // pulled, how fresh the underlying data is, and its inherent reporting lag.
  const series = Object.values(snap.data || {});
  const sources = [...new Set(series.map((v) => v.source).filter(Boolean))];
  const refPeriods = series.map((v) => (v.latest || {}).ref_period).filter(Boolean).sort();
  // STALEST series (oldest ref period) — the conservative "data is only current to"
  // bound. Series update on different cadences (daily BoC rates vs quarterly StatCan
  // ratios); the oldest limits how current the strategic picture really is.
  const sourceDataAsOf = refPeriods.length ? refPeriods[0] : null;
  const retrievedAts = series.map((v) => v.retrieved_at).filter(Boolean).sort();
  const dataRetrievedAt = retrievedAts.length ? retrievedAts[retrievedAts.length - 1] : null;
  const historyPeriods = Math.max(0, ...series.map((v) => v.n_periods || (v.trend || []).length || 0)) || null;
  const runMs = Date.parse(snap.run_at);
  const asOfMs = sourceDataAsOf ? Date.parse(sourceDataAsOf) : null;
  const sourceDataLagDays = asOfMs != null && !Number.isNaN(runMs)
    ? Math.max(0, Math.floor((runMs - asOfMs) / 86_400_000)) : null;

  // R4 Freshness SLA — deterministic (measured against snap.run_at, not Date.now,
  // so an unchanged upstream still yields a byte-identical file). Flags only clear
  // staleness (source ≥2 cycles behind), never inherent annual lag.
  const freshnessEntries = Object.entries(snap.data || {}).map(([key, v]) =>
    assessFreshness(key, (v.latest || {}).ref_period || (v.latest || {}).date, snap.run_at));
  const fresh = summarizeFreshness(freshnessEntries);

  const observability = {
    sourceCount: sources.length || null,
    indicatorCount: indicators.length || null,
    dataRetrievedAt,      // when the agent last pulled live data
    sourceDataAsOf,       // freshest underlying data point (ref period)
    sourceDataLagDays,    // inherent reporting lag: run − data date
    historyPeriods,       // deepest series history pulled
    seriesWithinSla: fresh.total ? fresh.withinSla : null, // series inside their release-cycle SLA
    seriesTracked: fresh.total || null,
    staleSeries: fresh.stale,                              // keys beyond SLA (behind a release / stalled refresh)
  };

  const out = {
    productId: "financial-intelligence",
    target: snap.target,
    runAt: snap.run_at,
    lastUpdated: snap.run_at,
    provenance:
      "live: Statistics Canada WDS · CMHC (via StatCan) · Bank of Canada Valet — from committed provenance snapshot",
    indicators,
    observability,
    executiveSummary,
    strategicRecommendations: recs.length ? recs : ["See the full strategic brief."],
    decisionTraces: [
      { step: "Segment selection", rationale: `${snap.target.demographic} — widest debt-service-ratio gap vs. product coverage.` },
      { step: "Data vintage", rationale: `Live pull from StatCan / CMHC / Bank of Canada; snapshot ${snap.run_at}.` },
    ],
    briefUrl:
      "https://github.com/shayeeboy/Financial-Intelligence-Strategy-Agent/blob/main/data/briefs/gta_newcomer_credit_opportunity.md",
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(
    `Wrote ${path.relative(ROOT, OUT)} — ${indicators.length} indicators, ${sources.length} sources, ${out.strategicRecommendations.length} recommendations.`
  );
}

main();
