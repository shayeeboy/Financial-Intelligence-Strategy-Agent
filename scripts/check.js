// Offline unit-acceptance tests — no network, no live APIs.
// Run: npm run check   (node --test)
//
// Each test maps to an acceptance criterion documented in the README.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { pct, money, yoy, annualize, requiredIncome, baselineYears } from '../src/lib/metrics.js';
import { resolveCoordinate, CONCEPT_VECTORS, GEO_ALIASES } from '../src/mcp/adapters/statcan.js';
import { BOC_SERIES } from '../src/mcp/adapters/bankofcanada.js';
import { compileStrategyBrief } from '../src/mcp/tools/compile_strategy_brief.js';

// --- Metric helpers ---------------------------------------------------------
test('AC-M1: pct/money format Canadian figures, null-safe', () => {
  assert.equal(pct(179.55), '179.55%');
  assert.equal(money(2045), '$2,045');
  assert.equal(pct(null), 'n/a');
  assert.equal(money(undefined), 'n/a');
});

test('AC-M2: yoy computes same-period year-over-year change', () => {
  const trend = [
    { ref_period: '2024-05-01', value: 100 },
    { ref_period: '2025-05-01', value: 105 },
    { ref_period: '2026-05-01', value: 110 },
  ];
  // latest 2026 vs prior-year 2025: (110-105)/105 = 4.76%
  assert.ok(Math.abs(yoy(trend) - 4.7619) < 0.01);
  assert.equal(yoy([{ ref_period: '2026-01-01', value: 1 }]), null); // too few points
});

test('AC-M3: annualize + 30% required-income rule', () => {
  assert.equal(annualize(2045), 24540);
  assert.equal(requiredIncome(24540), 81800); // 24540 / 0.30
  assert.equal(requiredIncome(null), null);
});

test('AC-M4: baselineYears drives the <3yr Low-Confidence guardrail', () => {
  const threeYrPlus = [{ ref_period: '2022-01-01' }, { ref_period: '2026-01-01' }];
  const underThree = [{ ref_period: '2025-01-01' }, { ref_period: '2026-01-01' }];
  assert.equal(baselineYears(threeYrPlus), 4);
  assert.ok(baselineYears(threeYrPlus) >= 3, 'passes guardrail');
  assert.ok(baselineYears(underThree) < 3, 'flagged Low Confidence');
});

// --- StatCan coordinate resolver -------------------------------------------
const FAKE_META = {
  dimension: [
    { dimensionPositionId: 1, dimensionNameEn: 'Geography', member: [
      { memberId: 1, memberNameEn: 'Canada' },
      { memberId: 125, memberNameEn: 'Toronto, Ontario' },
      { memberId: 184, memberNameEn: 'Vancouver, British Columbia' },
    ] },
    { dimensionPositionId: 2, dimensionNameEn: 'Type of unit', member: [
      { memberId: 1, memberNameEn: 'Total, all unit types' },
      { memberId: 3, memberNameEn: 'Two bedroom units' },
    ] },
  ],
};

test('AC-C1: resolveCoordinate matches members and zero-fills to 10 parts', () => {
  const { coordinate, resolved } = resolveCoordinate(FAKE_META, ['Toronto', 'Two bedroom']);
  assert.equal(coordinate, '125.3.0.0.0.0.0.0.0.0');
  assert.equal(resolved[0].member, 'Toronto, Ontario');
  assert.equal(resolved[1].member, 'Two bedroom units');
});

test('AC-C2: resolveCoordinate falls back to a Total/first member when unmatched', () => {
  const { resolved } = resolveCoordinate(FAKE_META, ['Toronto', null]);
  assert.match(resolved[1].member, /^Total/); // picked "Total, all unit types"
});

test('AC-C3: resolveCoordinate guards against a wrong-geography match', () => {
  // "Calgary" is not in FAKE_META → falls back to Canada (member 1), never a silent wrong CMA.
  const { resolved } = resolveCoordinate(FAKE_META, ['Calgary', 'Two bedroom']);
  assert.equal(resolved[0].member, 'Canada');
});

// --- Registries are well-formed --------------------------------------------
test('AC-R1: curated registries have the required shape', () => {
  for (const [k, v] of Object.entries(CONCEPT_VECTORS)) {
    assert.ok(Number.isInteger(v.vectorId), `${k} has an integer vectorId`);
    assert.ok(v.label && v.table_id, `${k} has label + table_id`);
  }
  for (const [k, v] of Object.entries(BOC_SERIES)) {
    assert.ok(v.id && v.label, `BoC ${k} has id + label`);
  }
  assert.ok(GEO_ALIASES.National && GEO_ALIASES.ON, 'geo aliases present');
});

// --- Brief compiler (filesystem, isolated temp dir) ------------------------
test('AC-B1: compile_strategy_brief rejects unsafe filenames and missing fields', async () => {
  const base = { target_demographic: 'X', banking_product_focus: 'Y', markdown_body: '# Z' };
  await assert.rejects(() => compileStrategyBrief({ ...base, filename: '../evil.md' }), /Invalid filename/);
  await assert.rejects(() => compileStrategyBrief({ ...base, filename: 'note.txt' }), /Invalid filename/);
  await assert.rejects(
    () => compileStrategyBrief({ filename: 'ok.md', target_demographic: '', banking_product_focus: 'Y', markdown_body: 'Z' }),
    /missing required field/
  );
});

test('AC-B2: compile_strategy_brief writes the brief and appends a matrix row', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fisa-brief-'));
  try {
    const res = await compileStrategyBrief({
      filename: 'test_brief.md',
      target_demographic: 'Gen Z, BC',
      banking_product_focus: 'Digital Payments',
      markdown_body: '# Test\nbody',
      geography: 'BC',
      confidence: 'High',
      briefsDir: dir,
    });
    const brief = await fs.readFile(path.join(dir, 'test_brief.md'), 'utf8');
    const index = await fs.readFile(path.join(dir, 'master_index.md'), 'utf8');
    assert.match(brief, /# Test/);
    assert.match(index, /\| Date \(UTC\) \|/); // header created
    assert.match(index, /Gen Z, BC .*Digital Payments.*\[test_brief\.md\]/);
    assert.ok(res.bytes > 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('AC-B3: re-compiling the same filename de-duplicates the matrix row', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'fisa-brief-'));
  try {
    const args = {
      filename: 'dupe.md',
      target_demographic: 'D',
      banking_product_focus: 'P',
      markdown_body: 'v1',
      briefsDir: dir,
    };
    await compileStrategyBrief(args);
    await compileStrategyBrief({ ...args, markdown_body: 'v2' });
    const index = await fs.readFile(path.join(dir, 'master_index.md'), 'utf8');
    const rows = index.split('\n').filter((l) => l.includes('](./dupe.md)'));
    assert.equal(rows.length, 1, 'exactly one row for the filename');
    const brief = await fs.readFile(path.join(dir, 'dupe.md'), 'utf8');
    assert.match(brief, /v2/); // content overwritten
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
