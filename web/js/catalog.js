// Option catalog for the browser brief generator.
// CMHC coordinates are precomputed (see docs/DATA-SOURCES.md) so the browser
// skips the heavy getCubeMetadata fetch and calls getDataFromCubePidCoord directly.
// Pure data — imported by the app and by the Node test suite (scripts/check.js).

export const PROVINCES = [
  { key: 'ON', label: 'Ontario' },
  { key: 'QC', label: 'Quebec' },
  { key: 'BC', label: 'British Columbia' },
  { key: 'AB', label: 'Alberta' },
  { key: 'MB', label: 'Manitoba' },
  { key: 'SK', label: 'Saskatchewan' },
  { key: 'Atlantic', label: 'Atlantic' },
];

// Census Metropolitan Areas with verified StatCan/CMHC coordinates.
// beds → Table 34-10-0133 (avg rent); vacancyCoord → Table 34-10-0127 (vacancy).
export const CMAS = {
  toronto: { label: 'Toronto', province: 'ON', statcanGeo: 'Toronto, Ontario', beds: { 'One bedroom': '125.3.2.0.0.0.0.0.0.0', 'Two bedroom': '125.3.3.0.0.0.0.0.0.0', 'Three bedroom': '125.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '23.0.0.0.0.0.0.0.0.0' },
  ottawa: { label: 'Ottawa', province: 'ON', statcanGeo: 'Ottawa-Gatineau, Ontario/Quebec', beds: { 'One bedroom': '105.3.2.0.0.0.0.0.0.0', 'Two bedroom': '105.3.3.0.0.0.0.0.0.0', 'Three bedroom': '105.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '11.0.0.0.0.0.0.0.0.0' },
  hamilton: { label: 'Hamilton', province: 'ON', statcanGeo: 'Hamilton, Ontario', beds: { 'One bedroom': '85.3.2.0.0.0.0.0.0.0', 'Two bedroom': '85.3.3.0.0.0.0.0.0.0', 'Three bedroom': '85.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '6.0.0.0.0.0.0.0.0.0' },
  montreal: { label: 'Montréal', province: 'QC', statcanGeo: 'Montréal, Quebec', beds: { 'One bedroom': '46.3.2.0.0.0.0.0.0.0', 'Two bedroom': '46.3.3.0.0.0.0.0.0.0', 'Three bedroom': '46.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '9.0.0.0.0.0.0.0.0.0' },
  quebec: { label: 'Québec City', province: 'QC', statcanGeo: 'Québec, Quebec', beds: { 'One bedroom': '48.3.2.0.0.0.0.0.0.0', 'Two bedroom': '48.3.3.0.0.0.0.0.0.0', 'Three bedroom': '48.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '14.0.0.0.0.0.0.0.0.0' },
  vancouver: { label: 'Vancouver', province: 'BC', statcanGeo: 'Vancouver, British Columbia', beds: { 'One bedroom': '184.3.2.0.0.0.0.0.0.0', 'Two bedroom': '184.3.3.0.0.0.0.0.0.0', 'Three bedroom': '184.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '25.0.0.0.0.0.0.0.0.0' },
  victoria: { label: 'Victoria', province: 'BC', statcanGeo: 'Victoria, British Columbia', beds: { 'One bedroom': '186.3.2.0.0.0.0.0.0.0', 'Two bedroom': '186.3.3.0.0.0.0.0.0.0', 'Three bedroom': '186.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '26.0.0.0.0.0.0.0.0.0' },
  calgary: { label: 'Calgary', province: 'AB', statcanGeo: 'Calgary, Alberta', beds: { 'One bedroom': '146.3.2.0.0.0.0.0.0.0', 'Two bedroom': '146.3.3.0.0.0.0.0.0.0', 'Three bedroom': '146.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '2.0.0.0.0.0.0.0.0.0' },
  edmonton: { label: 'Edmonton', province: 'AB', statcanGeo: 'Edmonton, Alberta', beds: { 'One bedroom': '148.3.2.0.0.0.0.0.0.0', 'Two bedroom': '148.3.3.0.0.0.0.0.0.0', 'Three bedroom': '148.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '4.0.0.0.0.0.0.0.0.0' },
  winnipeg: { label: 'Winnipeg', province: 'MB', statcanGeo: 'Winnipeg, Manitoba', beds: { 'One bedroom': '134.3.2.0.0.0.0.0.0.0', 'Two bedroom': '134.3.3.0.0.0.0.0.0.0', 'Three bedroom': '134.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '28.0.0.0.0.0.0.0.0.0' },
  saskatoon: { label: 'Saskatoon', province: 'SK', statcanGeo: 'Saskatoon, Saskatchewan', beds: { 'One bedroom': '141.3.2.0.0.0.0.0.0.0', 'Two bedroom': '141.3.3.0.0.0.0.0.0.0', 'Three bedroom': '141.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '19.0.0.0.0.0.0.0.0.0' },
  regina: { label: 'Regina', province: 'SK', statcanGeo: 'Regina, Saskatchewan', beds: { 'One bedroom': '140.3.2.0.0.0.0.0.0.0', 'Two bedroom': '140.3.3.0.0.0.0.0.0.0', 'Three bedroom': '140.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '15.0.0.0.0.0.0.0.0.0' },
  halifax: { label: 'Halifax', province: 'Atlantic', statcanGeo: 'Halifax, Nova Scotia', beds: { 'One bedroom': '10.3.2.0.0.0.0.0.0.0', 'Two bedroom': '10.3.3.0.0.0.0.0.0.0', 'Three bedroom': '10.3.4.0.0.0.0.0.0.0' }, vacancyCoord: '5.0.0.0.0.0.0.0.0.0' },
};

export const BEDROOMS = ['One bedroom', 'Two bedroom', 'Three bedroom'];

// Demographic lenses. `profile`/`posture` frame the narrative; `impediments`
// are structural friction points woven into the Impediments section.
export const DEMOGRAPHICS = {
  newcomers: {
    label: 'Newcomers to Canada (0–5 yrs)',
    profile: 'arrive with strong human capital but no domestic credit bureau footprint, so mainstream, prime-priced products are out of reach at exactly the moment they are forming every banking relationship',
    posture: 'creditworthy by capacity, excluded by information — a thin-file problem, not a risk problem',
    impediments: [
      '**Thin-file exclusion.** No domestic bureau history means otherwise-creditworthy households are pushed toward high-cost alternative lenders.',
      '**Cross-border money movement.** Remittances and inbound settlement funds make FX spreads and wire fees a recurring, visible pain point.',
    ],
  },
  genz: {
    label: 'Gen Z (18–26)',
    profile: 'are digital-first, early in their earning curve, and highly fee- and rate-sensitive, with little loyalty to an incumbent brand',
    posture: 'low balances today but the longest lifetime-value runway of any cohort',
    impediments: [
      '**Shallow credit history.** Young files mean small limits and higher pricing, nudging them toward BNPL and fintech alternatives.',
      '**Fee sensitivity + churn.** Zero switching cost and app-store-level expectations make a clunky or fee-heavy daily-banking experience an immediate defection trigger.',
    ],
  },
  millennials: {
    label: 'Millennials (27–42)',
    profile: 'are in peak household-formation years — mortgages, childcare, and debt-servicing collide with the highest shelter costs in a generation',
    posture: 'high income potential but stretched cash flow and heavy leverage',
    impediments: [
      '**Down-payment gap.** Shelter cost growth has outpaced saving capacity, deferring first purchases and lengthening the rent-and-save phase.',
      '**Debt-service strain.** Carrying mortgages plus consumer credit at current rates leaves thin discretionary bandwidth.',
    ],
  },
  genx: {
    label: 'Gen X (43–58)',
    profile: 'are in peak-earning, peak-obligation years — mortgages, teenagers, and ageing parents at once — and are the most under-served cohort for advice',
    posture: 'asset-rich but time-poor and advice-starved',
    impediments: [
      '**Sandwiched cash flow.** Simultaneous mortgage, education, and eldercare costs compress investable surplus.',
      '**Advice gap.** Too wealthy for basic banking, not yet courted by full private wealth — a coverage hole.',
    ],
  },
  boomers: {
    label: 'Boomers & pre-retirees (59+)',
    profile: 'are entering decumulation and the largest intergenerational wealth transfer in Canadian history, with deep deposit and investment balances',
    posture: 'balance-sheet-heavy, focused on income, preservation, and estate transfer',
    impediments: [
      '**Decumulation complexity.** Converting assets into reliable retirement income (RRIF, annuitization) is under-supported at the mass-affluent tier.',
      '**Transfer leakage.** Heirs often bank elsewhere; the wealth-transfer moment is a major retention risk.',
    ],
  },
  students: {
    label: 'Post-secondary students',
    profile: 'are pre-income, credit-thin, and acquiring their first-ever financial relationships — the classic land-and-expand cohort',
    posture: 'minimal balances now, but first-account stickiness is decades long',
    impediments: [
      '**No income, no file.** Traditional adjudication excludes them, ceding ground to campus fintechs.',
      '**Fee intolerance.** Any monthly fee or overdraft surprise on a thin balance drives immediate churn.',
    ],
  },
  families: {
    label: 'Young families with children',
    profile: 'juggle childcare, first or second homes, and long-horizon saving (RESP) on a single stretched household budget',
    posture: 'goal-driven savers with acute short-term liquidity pressure',
    impediments: [
      '**Childcare + shelter squeeze.** Two of the largest line items hit simultaneously, crowding out saving.',
      '**Fragmented goals.** Emergency buffer, RESP, and home equity compete for the same limited surplus.',
    ],
  },
};

// Product (brief-type) plays. Each carries a category and concrete opportunities.
export const PRODUCTS = {
  newcomer_credit: {
    label: 'Newcomer Credit & Daily Banking',
    category: 'Newcomer Credit (secured/credit-builder) & Daily Banking (chequing, remittances)',
    opportunities: [
      '**Secured / credit-builder card with graduation logic** — open on a refundable deposit, report to both bureaus, auto-convert to unsecured after 9–12 months of on-time behaviour, underwriting the initial limit on verified cash inflows rather than a (missing) bureau score.',
      '**Rent-reporting credit formation** — report the monthly rent payment as a positive tradeline, turning the segment’s largest expense into its fastest route to a thick file.',
      '**No-minimum chequing with transparent FX and low-cost digital remittances** — position the money-movement corridor as the acquisition wedge; the primary chequing relationship follows the remittance habit.',
    ],
  },
  mortgages: {
    label: 'Mortgages & Home Ownership',
    category: 'Mortgages, HELOCs & home-ownership readiness',
    opportunities: [
      '**Mortgage-readiness track** — a structured 24–36 month program (savings automation + credit-builder + pre-qualification) that keeps renters in-house until they graduate to a mortgage.',
      '**Rent-vs-own affordability tooling** — surface the local rent, required income, and rate picture so the household can time a purchase; capture the deposit relationship in the meantime.',
      '**Flexible-structure mortgages** — extended amortization, blend-and-extend, and portability options that respond to stretched debt-service ratios without forecasting rates.',
    ],
  },
  wealth: {
    label: 'Wealth Management & Investments',
    category: 'Registered investing (RRSP/TFSA/RESP), advice & decumulation',
    opportunities: [
      '**Goal-based registered investing** — TFSA-first for flexibility, RRSP for tax deferral, RESP for families; automated contributions tied to a named goal.',
      '**Mass-affluent advice tier** — a hybrid digital+human offer for the advice-gap cohort too big for basic banking but under-served by private wealth.',
      '**Decumulation & transfer planning** — RRIF/annuitization income design and an heir-onboarding motion to defend the wealth-transfer moment.',
    ],
  },
  payments: {
    label: 'Digital Payments & Daily Banking',
    category: 'Everyday payments, chequing & money movement',
    opportunities: [
      '**No-fee, app-first chequing** — instant onboarding, real-time balance, and spend insights that meet app-store expectations and remove the churn trigger.',
      '**Low-cost transfers & FX** — transparent domestic and cross-border money movement positioned as the acquisition wedge.',
      '**Embedded rewards on everyday spend** — round-up-to-save and category cashback that make the daily account the default one.',
    ],
  },
  lending: {
    label: 'Credit Cards & Consumer Lending',
    category: 'Cards, lines of credit & instalment lending',
    opportunities: [
      '**Cash-flow-underwritten starter credit** — price on verified income and account behaviour, not just bureau score, to safely extend first credit.',
      '**Transparent instalment lending / BNPL alternative** — a bank-grade, clearly-priced instalment option that competes with fintech BNPL on trust.',
      '**Line-of-credit for lumpy costs** — a revolving facility sized to the household’s real cash-flow cadence for childcare, tuition, or eldercare spikes.',
    ],
  },
  savings: {
    label: 'Savings & High-Yield Deposits',
    category: 'High-yield savings, GICs & liquidity buffers',
    opportunities: [
      '**Goal-based high-yield pockets** — named "first home / emergency / RESP" buckets with a competitive pass-through rate to anchor deposits early.',
      '**Automated buffer building** — round-ups and pay-cycle sweeps that grow a shelter/emergency buffer without behaviour change.',
      '**Laddered GICs for income** — short-ladder structures for pre-retirees seeking predictable, preservation-first yield.',
    ],
  },
};
