// Pure brief composer: (selections, data) -> markdown string.
// No network, no DOM — imported by the app (browser) and by scripts/check.js (Node).

import { CMAS, DEMOGRAPHICS, PRODUCTS } from './catalog.js';
import { pct, money, yoy, annualize, requiredIncome, baselineYears, periodDelta, sparkline, deltaArrow } from './metrics.js';

// R6 — a forecast-free "Trend" cell: directional period-over-period delta + a
// unicode sparkline, derived from the same series (so it shares the row's citation).
function trendCell(series) {
  // StatCan points are ascending; BoC observations can be newest-first — sort so
  // the delta (latest vs prior) and sparkline direction are always correct.
  const pts = [...(series.points || series.observations || [])].sort((a, b) =>
    String(a.ref_period || a.date).localeCompare(String(b.ref_period || b.date)));
  const d = periodDelta(pts);
  const spark = sparkline(pts.map((p) => p.value));
  if (!d) return spark || '—';
  const pctStr = d.pct == null ? '' : ` ${d.pct >= 0 ? '+' : ''}${d.pct.toFixed(1)}%`;
  return `${deltaArrow(d.direction)}${pctStr} \`${spark}\``.trim();
}

// R1 — real age-cohort financial position (StatCan DHEA), contrasted with national.
function cohortSection(c, demo, debtNat) {
  const natDti = debtNat?.latest?.value ?? null;
  const lever = c.debtToIncome == null || natDti == null ? 'comparable to'
    : c.debtToIncome > natDti + 3 ? 'more leveraged than'
    : c.debtToIncome < natDti - 3 ? 'less leveraged than' : 'in line with';
  return `**Cohort financial position — households aged ${c.band}** *(Statistics Canada [DHEA](${c.wealthUrl}), per household — the real cohort behind "${demo.label}", not a national proxy; wealth @ ${c.asOf}, income @ ${c.incomeAsOf})*

| Cohort indicator (per household) | ${c.band} households |
| --- | --- |
| Net worth | ${money(c.netWorth)} |
| Total debt (liabilities) | ${money(c.totalDebt)} |
| Mortgage debt | ${money(c.mortgageDebt)} |
| Disposable income | ${money(c.disposableIncome)} |
| Debt-to-disposable-income | ${pct(c.debtToIncome)} · national ${pct(natDti)} |

**Financial Services Implication:** This cohort is **${lever}** the national average (${pct(c.debtToIncome)} vs ${pct(natDti)} debt-to-income) and holds ${money(c.netWorth)} in net worth — price and design to the cohort's *actual* balance sheet, not the national aggregate.

`;
}

/**
 * @param {object} sel  { cmaKey, bedroom, demographicKey, productKey }
 * @param {object} data { debt, credit, cpi, rent, vacancy, policy, prime, mtg5 }
 *                      each series = { latest:{ref_period|date,value}, points:[...] }
 * @returns {{ markdown:string, confidence:string, filename:string }}
 */
export function composeBrief(sel, data) {
  const cma = CMAS[sel.cmaKey];
  const demo = DEMOGRAPHICS[sel.demographicKey];
  const prod = PRODUCTS[sel.productKey];
  if (!cma || !demo || !prod) throw new Error('composeBrief: unknown cma/demographic/product key');

  const { debt, credit, cpi, rent, vacancy, policy, prime, mtg5, cohort = null } = data;
  const bedroom = sel.bedroom || 'Two bedroom';

  // R1 — cohort financial position block (real age-cohort data, when the demographic
  // is age-defined). For non-age demographics `cohort` is null and this is omitted.
  const cohortBlock = cohort ? cohortSection(cohort, demo, debt) : '';

  // Derived figures.
  const cpiYoY = yoy(cpi.points);
  const rentYoY = yoy(rent.points);
  const annualRent = annualize(rent.latest?.value ?? null);
  const income = requiredIncome(annualRent);
  const incomeRounded = income == null ? null : Math.round(income / 1000) * 1000;

  // Confidence guardrail: any macro/housing series with < 3 yrs baseline.
  const lowConf = [debt, credit, cpi, rent, vacancy].filter((s) => baselineYears(s.points) < 3);
  const confidence = lowConf.length ? 'Low Confidence' : 'High';

  const today = new Date().toISOString().slice(0, 10);
  const rperiod = rent.latest?.ref_period;
  const statcanUrl = (pid) => `https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=${pid}`;

  const md = `# Strategic Brief — ${prod.label}, ${cma.label}

**Demographic Group:** ${demo.label} — ${cma.label} (${cma.statcanGeo})
**Financial Product Category:** ${prod.category}
**Prepared:** ${today} · **Confidence:** ${confidence} · **Data vintage:** live pull from StatCan WDS, CMHC (via StatCan) & Bank of Canada Valet

> **Guardrail note:** Reports empirical trend realities only — no interest-rate forecasts, no market-crash predictions, and no legal, compliance, or FINTRAC/Bank Act regulatory advice. Product ideas are strategic, not regulatory guarantees.

---

## Executive Summary

Canadian households remain among the most leveraged in the G7: credit-market debt sat at **${pct(debt.latest.value)} of disposable income** as of ${debt.latest.ref_period}, with consumer-credit-plus-mortgage liabilities at **${pct(credit.latest.value)}**. Against that backdrop, shelter cost is the binding constraint on the discretionary financial bandwidth of **${demo.label}** in **${cma.label}** — an average ${bedroom.toLowerCase()} apartment runs **${money(rent.latest.value)}/month** (${rperiod}), roughly **${money(annualRent)}/year**. On the 30%-of-income affordability rule, a household needs about **${money(incomeRounded)}/year in gross income** to carry that unit alone.

With the Bank of Canada overnight target at **${pct(policy.latest.value)}** and the chartered-bank prime rate at **${pct(prime.latest.value)}**, the rate environment shapes both borrowing cost and deposit yield. This cohort ${demo.profile} — ${demo.posture}. That gap between capacity and access is the commercial opportunity this brief maps to ${prod.label.toLowerCase()}.

**Financial Services Implication:** ${cma.label}'s ${demo.label.toLowerCase()} are an under-served, high-lifetime-value segment. The institution that aligns ${prod.label.toLowerCase()} to their real cash-flow and shelter constraints captures the primary relationship at its highest-switching-propensity moment.

---

## Demographic Profile & Financial Status (Data-backed)

| Indicator | Value | Trend (Δ vs prior · history) | As of | Source |
| --- | --- | --- | --- | --- |
| Household credit-market debt ÷ disposable income | **${pct(debt.latest.value)}** | ${trendCell(debt)} | ${debt.latest.ref_period} | [StatCan WDS](${statcanUrl('38100238')}) |
| Consumer credit + mortgage ÷ disposable income | **${pct(credit.latest.value)}** | ${trendCell(credit)} | ${credit.latest.ref_period} | [StatCan WDS](${statcanUrl('38100238')}) |
| CPI, all-items (YoY) | **${cpiYoY == null ? 'n/a' : cpiYoY.toFixed(1) + '%'}** | ${trendCell(cpi)} | ${cpi.latest.ref_period} | [StatCan WDS](${statcanUrl('18100004')}) |
| ${cma.label} — avg ${bedroom.toLowerCase()} rent | **${money(rent.latest.value)}/mo** (${rentYoY == null ? 'n/a' : rentYoY.toFixed(1) + '% YoY'}) | ${trendCell(rent)} | ${rperiod} | [CMHC via StatCan](${statcanUrl('34100133')}) |
| ${cma.label} — rental vacancy rate | **${pct(vacancy.latest.value)}** | ${trendCell(vacancy)} | ${vacancy.latest.ref_period} | [CMHC via StatCan](${statcanUrl('34100127')}) |
| Bank of Canada overnight target | **${pct(policy.latest.value)}** | ${trendCell(policy)} | ${policy.latest.date} | [BoC Valet](https://www.bankofcanada.ca/valet/observations/V39079) |
| Chartered-bank prime rate | **${pct(prime.latest.value)}** | ${trendCell(prime)} | ${prime.latest.date} | [BoC Valet](https://www.bankofcanada.ca/valet/observations/V80691311) |
| Conventional 5-year mortgage rate | **${pct(mtg5.latest.value)}** | ${trendCell(mtg5)} | ${mtg5.latest.date} | [BoC Valet](https://www.bankofcanada.ca/valet/observations/V80691335) |

*Trend shows the change vs the prior period (▲ up · ▼ down · ▬ flat) and a sparkline of recent history — descriptive only, not a forecast.*

**Reading the data.** National household leverage near **${pct(debt.latest.value)}** shows the incumbent base has little unused borrowing headroom — growth must come from *new* relationships. In ${cma.label}, ${demo.label.toLowerCase()} ${demo.profile}.

**Financial Services Implication:** Segment economics favour products matched to this cohort's ${demo.posture} — priced on real cash flow, not on assumptions that don't hold for them.

${cohortBlock}---

## Structural Impediments & Lifestyle Choices

1. **Shelter cost crowds out savings and debt-service capacity.** At ${money(rent.latest.value)}/month for a ${bedroom.toLowerCase()} (${rentYoY == null ? 'trend n/a' : rentYoY.toFixed(1) + '% YoY'}) and a ${cma.label} vacancy rate of ${pct(vacancy.latest.value)} (${vacancy.latest.ref_period}), the rental market sets the household's fixed-cost floor and delays every downstream banking event.
${demo.impediments.map((x, i) => `${i + 2}. ${x}`).join('\n')}
${demo.impediments.length + 2}. **Rate environment.** With a ${pct(prime.latest.value)} prime rate and ${pct(mtg5.latest.value)} 5-year mortgage rate, borrowing costs and deposit yields both bear directly on this cohort's monthly math.

**Financial Services Implication:** Each impediment is a product hook — shelter stress → high-yield savings and rent-reporting; access gaps → cash-flow underwriting; rate exposure → flexible structures. This is the bridge from data to the ${prod.label.toLowerCase()} plays below.

---

## Product Innovation Opportunities (Actionable banking strategies)

**Focus: ${prod.category}.**

${prod.opportunities.map((o, i) => `${i + 1}. ${o}`).join('\n')}

**Financial Services Implication:** Sequenced against this cohort's life-cycle, these plays form a single retention ladder — acquire on the sharpest pain point, deepen as the household's balance sheet matures, and defend the relationship at each transition.

---

## Sources & Methodology

All figures are pulled live from public APIs at generation time, directly in the browser:
- **Statistics Canada — WDS:** household leverage (Table 38-10-0238), CPI (Table 18-10-0004).
- **CMHC Rental Market Survey (via StatCan WDS):** average rents (34-10-0133), vacancy (34-10-0127).
- **Bank of Canada — Valet API:** overnight target, prime, conventional 5-year mortgage rate.

*Derived figures* (YoY, annualized rent, 30%-rule income) are computed from the above. Household leverage and CPI are **national**; rent and vacancy are **${cma.label}-specific**. ${cohort ? `Cohort figures (net worth, debt, income, DTI for age ${cohort.band}) are **real StatCan DHEA micro-data** for this generation. Product framing is qualitative.` : 'This demographic has no clean age-cohort series, so its figures are national/metro proxies with qualitative framing.'} Confidence: **${confidence}**.
`;

  const filename = `${sel.cmaKey}_${sel.demographicKey}_${sel.productKey}.md`;
  return { markdown: md, confidence, filename };
}
