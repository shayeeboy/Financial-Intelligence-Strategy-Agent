#!/usr/bin/env node
// Orchestrator — runs the Standard Operating Procedure end-to-end and emits ONE
// data-backed strategy brief using live Canadian open data.
//
//   1. Identify gaps (read master_index)     4. Strategic synthesis (compose brief)
//   2. Gather demographic/behaviour data      5. Write file + matrix
//   3. Cross-reference housing cost           6. Update memory.md
//
// Usage: node src/orchestrator.js

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { queryFinancialBehaviour } from './mcp/adapters/statcan.js';
import { fetchHousingInsight } from './mcp/adapters/cmhc.js';
import { fetchSeries } from './mcp/adapters/bankofcanada.js';
import { compileStrategyBrief, ROOT } from './mcp/tools/compile_strategy_brief.js';
import { pct, money, yoy, annualize, requiredIncome, baselineYears } from './lib/metrics.js';

const RAW_DIR = path.join(ROOT, 'data', 'raw');
const MEMORY_PATH = path.join(ROOT, 'memory.md');

// ---- Target of this run -----------------------------------------------------
const TARGET = {
  filename: 'gta_newcomer_credit_opportunity.md',
  demographic: 'Newcomers to Canada (0–5 yrs), Greater Toronto Area',
  product: 'Newcomer Credit & Daily Banking',
  geography: 'ON — Toronto CMA',
  cma: 'Toronto',
};

async function main() {
  console.error(`[orchestrator] SOP run for: ${TARGET.demographic} → ${TARGET.product}`);

  // --- Step 2/3: gather live data -------------------------------------------
  const [debt, credit, cpi, rent2br, vacancy, policy, prime, mtg5] = await Promise.all([
    queryFinancialBehaviour({ concept: 'debt_to_disposable_income', latestN: 16 }),
    queryFinancialBehaviour({ concept: 'consumer_credit_mortgage_to_income', latestN: 16 }),
    queryFinancialBehaviour({ concept: 'cpi_all_items', latestN: 40 }),
    fetchHousingInsight({ cma_zone: TARGET.cma, metric: 'rental_affordability', bedroom: 'Two bedroom', latestN: 6 }),
    fetchHousingInsight({ cma_zone: TARGET.cma, metric: 'vacancy_rate', bedroom: 'Total', latestN: 6 }),
    fetchSeries('policy_rate', 2),
    fetchSeries('prime_rate', 2),
    fetchSeries('5yr_mortgage', 2),
  ]);

  // Persist a raw snapshot for provenance / reproducibility.
  await fs.mkdir(RAW_DIR, { recursive: true });
  const snapshot = { run_at: new Date().toISOString(), target: TARGET, data: { debt, credit, cpi, rent2br, vacancy, policy, prime, mtg5 } };
  const snapPath = path.join(RAW_DIR, `snapshot_${TARGET.filename.replace('.md', '')}.json`);
  await fs.writeFile(snapPath, JSON.stringify(snapshot, null, 2), 'utf8');

  // --- Derived metrics -------------------------------------------------------
  const cpiYoY = yoy(cpi.trend);
  const rentYoY = yoy(rent2br.trend);
  const annualRent = annualize(rent2br.latest?.value ?? null);
  const incomeToAfford = requiredIncome(annualRent); // 30% shelter rule

  // --- Confidence guardrail: flag series with < 3 years of baseline ----------
  const lowConf = [debt, credit, cpi, rent2br, vacancy].filter((r) => baselineYears(r.trend) < 3);
  const confidence = lowConf.length ? 'Low Confidence' : 'High';
  if (lowConf.length) {
    console.error(`[orchestrator] ⚠️ LOW CONFIDENCE — <3yr baseline: ${lowConf.map((r) => r.label).join('; ')}`);
  }

  // --- Step 4: strategic synthesis ------------------------------------------
  const body = composeBrief({ debt, credit, cpi, rent2br, vacancy, policy, prime, mtg5, cpiYoY, rentYoY, annualRent, incomeToAfford, confidence });

  // --- Step 5: write file + matrix ------------------------------------------
  const res = await compileStrategyBrief({
    filename: TARGET.filename,
    target_demographic: TARGET.demographic,
    banking_product_focus: TARGET.product,
    markdown_body: body,
    geography: TARGET.geography,
    confidence,
  });
  console.error(`[orchestrator] wrote ${res.written} (${res.bytes} bytes) and updated ${res.index}`);

  // --- Step 6: update memory.md ---------------------------------------------
  await updateMemory({ debt, cpi, rent2br, vacancy, policy, confidence, snapPath, res });
  console.error('[orchestrator] memory.md updated. Done.');
}

// ---------------------------------------------------------------------------
function composeBrief(d) {
  const { debt, credit, cpi, rent2br, vacancy, policy, prime, mtg5, cpiYoY, rentYoY, annualRent, incomeToAfford, confidence } = d;
  const src = (r) => `[${r.source}](${r.source_url || r.url})`;
  const asOf = (r) => r.latest?.ref_period || r.latest?.date;
  const today = new Date().toISOString().slice(0, 10);

  return `# Strategic Brief — Newcomer Credit & Daily Banking, Greater Toronto Area

**Demographic Group:** Newcomers to Canada (0–5 years since landing), Greater Toronto Area (Toronto CMA)
**Financial Product Category:** Newcomer Credit (secured cards, credit-builder lines) & Daily Banking (chequing, digital remittances)
**Prepared:** ${today} · **Confidence:** ${confidence} · **Data vintage:** live pull from StatCan WDS, CMHC (via StatCan) & Bank of Canada Valet

> **Guardrail note:** This brief reports empirical trend realities only. It contains no interest-rate forecasts, no market-crash predictions, and no legal, compliance, or FINTRAC/Bank Act regulatory advice. Product ideas are strategic, not regulatory guarantees.

---

## Executive Summary

Canadian households remain among the most leveraged in the G7: credit-market debt sat at **${pct(debt.latest.value)} of disposable income** as of ${asOf(debt)}, with consumer-credit-plus-mortgage liabilities at **${pct(credit.latest.value)}**. Against that backdrop, GTA shelter costs are the binding constraint on newcomer financial bandwidth — an average two-bedroom apartment in the Toronto CMA runs **${money(rent2br.latest.value)}/month** (${asOf(rent2br)}), or roughly **${money(annualRent)}/year**. On the standard 30%-of-income affordability rule, a household would need about **${money(Math.round(incomeToAfford / 1000) * 1000)}/year in gross income** to carry that unit alone — well above what most households earn in their first years in Canada.

With the Bank of Canada overnight target at **${pct(policy.latest.value)}** and the chartered-bank prime rate at **${pct(prime.latest.value)}** (${asOf(policy)}), borrowing is meaningfully cheaper than at the 2023–24 peak, yet newcomers are structurally excluded from mainstream credit by **thin or absent domestic credit files** — not by capacity to pay. This is the core commercial opportunity: products that manufacture credit history, price on cash-flow rather than bureau score, and reduce the cost of moving money across borders.

**Financial Services Implication:** The GTA newcomer segment is a high-lifetime-value, under-served acquisition pool. The institution that solves *first-file credit formation* and *low-friction remittance* captures the primary banking relationship at the moment of highest switching propensity — landing.

---

## Demographic Profile & Financial Status (Data-backed)

| Indicator | Value | As of | Source |
| --- | --- | --- | --- |
| Household credit-market debt ÷ disposable income | **${pct(debt.latest.value)}** | ${asOf(debt)} | ${src(debt)} |
| Consumer credit + mortgage ÷ disposable income | **${pct(credit.latest.value)}** | ${asOf(credit)} | ${src(credit)} |
| CPI, all-items (YoY) | **${cpiYoY == null ? 'n/a' : cpiYoY.toFixed(1) + '%'}** | ${asOf(cpi)} | ${src(cpi)} |
| Toronto CMA — avg 2-bedroom rent | **${money(rent2br.latest.value)}/mo** (${rentYoY == null ? 'n/a' : rentYoY.toFixed(1) + '% YoY'}) | ${asOf(rent2br)} | ${src(rent2br)} |
| Toronto CMA — rental vacancy rate | **${pct(vacancy.latest.value)}** | ${asOf(vacancy)} | ${src(vacancy)} |
| Bank of Canada overnight target | **${pct(policy.latest.value)}** | ${asOf(policy)} | ${src(policy)} |
| Chartered-bank prime rate | **${pct(prime.latest.value)}** | ${asOf(prime)} | ${src(prime)} |
| Conventional 5-year mortgage rate | **${pct(mtg5.latest.value)}** | ${asOf(mtg5)} | ${src(mtg5)} |

**Reading the data.** National household leverage near **${pct(debt.latest.value)}** shows the incumbent customer base has little unused borrowing headroom — growth must come from *new* relationships, and newcomers are the largest such inflow into the GTA. Newcomers typically arrive with strong human capital but **no domestic bureau footprint**, so they cannot access the prime-priced chequing, card, and credit products that the leverage figures above are built on.

**Financial Services Implication:** Segment acquisition economics favour cash-flow-underwritten "starter" products (secured cards, credit-builder loans, fee-transparent chequing) that convert a no-file newcomer into a scored, cross-sellable customer within 6–12 months.

---

## Structural Impediments & Lifestyle Choices

1. **Shelter cost crowds out savings and debt-service capacity.** At ${money(rent2br.latest.value)}/month for a two-bedroom (${rentYoY == null ? 'trend n/a' : rentYoY.toFixed(1) + '% YoY'}) and a Toronto vacancy rate of just ${pct(vacancy.latest.value)} (${asOf(vacancy)}), the rental market is tight and expensive. High fixed shelter cost delays every downstream banking event: first credit card, first auto loan, first mortgage.
2. **Thin-file exclusion.** Mainstream credit adjudication depends on a domestic bureau history newcomers do not yet have — an information problem, not a risk problem. This pushes otherwise creditworthy households toward high-cost alternative lenders.
3. **Delayed home ownership.** With required income to rent a 2-bedroom on the 30% rule near ${money(Math.round(incomeToAfford / 1000) * 1000)}/year and 5-year mortgage rates at ${pct(mtg5.latest.value)}, ownership is deferred well beyond the first five years — extending the "rent + build-credit" phase of the relationship.
4. **Cross-border money movement.** Newcomers routinely send remittances and receive settlement funds from abroad; incumbent FX spreads and wire fees are a recurring, visible pain point that erodes primary-bank loyalty.

**Financial Services Implication:** Each impediment is a product hook. Shelter stress → high-yield savings + rent-reporting-to-bureau; thin file → credit-builder products; deferred ownership → a longer daily-banking runway to cross-sell; remittance friction → embedded low-cost transfers as an acquisition wedge.

---

## Product Innovation Opportunities (Actionable banking strategies)

### A. Newcomer Credit
- **Secured / credit-builder card with graduation logic.** Open on a refundable deposit, report to both bureaus, and auto-convert to an unsecured line after 9–12 months of on-time behaviour. Underwrite the initial limit on verified cash inflows, not on a (non-existent) bureau score.
- **Rent-reporting credit formation.** Report the ~${money(rent2br.latest.value)}/month rent payment as a positive tradeline, turning the segment's single largest expense into its fastest route to a thick file.

### B. Daily Banking
- **No-minimum chequing with transparent FX and low-cost digital remittances.** Position the money-movement corridor (not the account) as the acquisition wedge; the primary chequing relationship follows the remittance habit.
- **High-yield savings for shelter/settlement buffers.** With prime at ${pct(prime.latest.value)}, pass through a competitive deposit rate on a goal-based "first home / emergency" pocket to anchor deposits early.

### C. Bridge to Ownership (retention)
- **Newcomer mortgage readiness track.** A structured 24–36 month program (savings automation + credit-builder + pre-qualification) that keeps the household in-house until it graduates to a ${pct(mtg5.latest.value)}-era mortgage — converting today's renter into tomorrow's mortgage holder.

**Financial Services Implication:** Sequenced correctly — remittance/chequing at landing, credit-builder in year 1, mortgage-readiness by year 3 — these products form a single retention ladder that captures the customer's full early-Canada financial life-cycle.

---

## Sources & Methodology

All figures are pulled live from public APIs at generation time and snapshotted to \`/data/raw/\`:
- **Statistics Canada — Web Data Service (WDS):** household leverage (Table 38-10-0238), CPI (Table 18-10-0004).
- **CMHC Rental Market Survey (via StatCan WDS):** average rents (Table 34-10-0133), vacancy rates (Table 34-10-0127).
- **Bank of Canada — Valet API:** overnight target, prime rate, conventional 5-year mortgage rate.

*Derived figures* (YoY changes, annualized rent, 30%-rule required income) are computed from the above; no third-party estimates are introduced. Newcomer-specific structural context (thin-file exclusion, remittance behaviour) is presented as qualitative segment reasoning, not as StatCan micro-data. Confidence rating for this brief: **${confidence}**.
`;
}

// ---------------------------------------------------------------------------
async function updateMemory({ debt, cpi, rent2br, vacancy, policy, confidence, snapPath, res }) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');
  const md = `# Financial-Demographic-Strategist — Running State Log

Last Execution: ${now}

## Active Ingestion Vectors
- [x] StatCan Table 38-10-0238: Household credit-market debt to disposable income → ${pct(debt.latest.value)} @ ${debt.latest.ref_period}
- [x] StatCan Table 18-10-0004: CPI all-items → ${cpi.latest.value} @ ${cpi.latest.ref_period}
- [x] CMHC Table 34-10-0133 (via StatCan): Toronto avg 2BR rent → ${money(rent2br.latest.value)} @ ${rent2br.latest.ref_period}
- [x] CMHC Table 34-10-0127 (via StatCan): Toronto vacancy → ${pct(vacancy.latest.value)} @ ${vacancy.latest.ref_period}
- [x] Bank of Canada Valet: overnight target → ${pct(policy.latest.value)} @ ${policy.latest.date}

## Strategy Briefs Generated
- /${res.written} (Product: Newcomer Credit & Daily Banking) — Confidence: ${confidence}

## Data Provenance
- Raw snapshot: /${rel(snapPath)}

## Confidence / Escalation
- Baseline check: ${confidence === 'Low Confidence' ? '⚠️ LOW CONFIDENCE — one or more series had <3yr baseline; verify before circulation.' : 'OK — all series carry ≥3yr baseline.'}

## Immediate Backlog Priority
- Cross-reference Gen Z digital-payment behaviours with credit-union membership data in British Columbia.
- Add StatCan newcomer-specific income/credit vectors to CONCEPT_VECTORS for cohort-level (not national) figures.
`;
  await fs.writeFile(MEMORY_PATH, md, 'utf8');
}

main().catch((e) => {
  console.error('[orchestrator] FAILED:', e.message);
  process.exit(1);
});
