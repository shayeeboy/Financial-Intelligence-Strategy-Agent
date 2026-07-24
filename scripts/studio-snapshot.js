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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SNAP = path.join(ROOT, "data/raw/snapshot_gta_newcomer_credit_opportunity.json");
const BRIEF = path.join(ROOT, "data/briefs/gta_newcomer_credit_opportunity.md");
const OUT = path.join(ROOT, "web/studio-snapshot.json");

// Display units per indicator key in the provenance snapshot.
const UNITS = { debt: "%", credit: "%", cpi: "index", rent2br: "CAD/mo", vacancy: "%", policy: "%", prime: "%", mtg5: "%" };

function trendPoints(v) {
  return (v.trend || []).slice(-8).map((p) => ({ period: p.ref_period || p.date, value: p.value }));
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
    return {
      key,
      label: v.label || key,
      value: latest.value ?? v.value ?? null,
      unit: UNITS[key] || "",
      source: v.source || "",
      sourceUrl: v.source_url || "",
      refPeriod: latest.ref_period || latest.date || null,
      trend: trendPoints(v),
    };
  });

  // Executive summary = first non-empty line of the brief's Executive Summary section.
  const execSection = section(brief, "Executive Summary");
  const executiveSummary =
    execSection.split("\n").map((l) => l.trim()).filter(Boolean)[0] ||
    "Strategy brief for the target segment.";

  // Strategic recommendations = the bolded product-opportunity headlines in the brief.
  const recs = [...brief.matchAll(/^-\s+\*\*(.+?)\*\*/gm)].map((m) => m[1].trim()).slice(0, 6);

  const out = {
    productId: "financial-intelligence",
    target: snap.target,
    runAt: snap.run_at,
    lastUpdated: snap.run_at,
    provenance:
      "live: Statistics Canada WDS · CMHC (via StatCan) · Bank of Canada Valet — from committed provenance snapshot",
    indicators,
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
    `Wrote ${path.relative(ROOT, OUT)} — ${indicators.length} indicators, ${out.strategicRecommendations.length} recommendations.`
  );
}

main();
