// Live smoke test: exercises every adapter against the real upstream APIs.
// Run: node scripts/smoke.js
import { fetchSeries, fetchRateEnvironment } from '../src/mcp/adapters/bankofcanada.js';
import { queryFinancialBehaviour, CONCEPT_VECTORS } from '../src/mcp/adapters/statcan.js';
import { fetchHousingInsight } from '../src/mcp/adapters/cmhc.js';

const line = (s) => console.log(s);
let fails = 0;

async function check(name, fn) {
  try {
    const out = await fn();
    line(`✅ ${name}`);
    return out;
  } catch (e) {
    fails++;
    line(`❌ ${name}: ${e.message}`);
    return null;
  }
}

line('=== Bank of Canada ===');
const boc = await check('BoC policy_rate', () => fetchSeries('policy_rate', 3));
if (boc) line(`   latest ${boc.label}: ${boc.latest?.value} @ ${boc.latest?.date}`);
const env = await check('BoC rate environment', () => fetchRateEnvironment());
if (env) for (const [k, v] of Object.entries(env)) line(`   ${k}: ${v.latest?.value ?? v.error}`);

line('\n=== Statistics Canada (curated concepts) ===');
for (const concept of Object.keys(CONCEPT_VECTORS)) {
  const r = await check(`StatCan ${concept}`, () => queryFinancialBehaviour({ concept }));
  if (r) line(`   ${r.label}: ${r.latest?.value} @ ${r.latest?.ref_period} (${r.n_periods} pts)`);
}

line('\n=== CMHC (via StatCan) ===');
for (const cma of ['Toronto', 'Vancouver', 'Calgary']) {
  const r = await check(`CMHC avg rent ${cma}`, () =>
    fetchHousingInsight({ cma_zone: cma, metric: 'rental_affordability', bedroom: 'Two bedroom' })
  );
  if (r) line(`   ${cma} (${r.unit_type}): $${r.latest?.value} @ ${r.latest?.ref_period}`);
}
const vac = await check('CMHC vacancy Toronto', () =>
  fetchHousingInsight({ cma_zone: 'Toronto', metric: 'vacancy_rate', bedroom: 'Total' })
);
if (vac) line(`   Toronto vacancy: ${vac.latest?.value}% @ ${vac.latest?.ref_period}`);

line(`\n${fails === 0 ? '🎉 ALL PASSED' : `⚠️  ${fails} check(s) failed`}`);
process.exit(fails === 0 ? 0 : 1);
