// Tool: compile_strategy_brief
// Writes a strategy brief to /data/briefs and appends a row to the
// business-facing master_index.md matrix (creating it if absent).

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '../../..');
export const BRIEFS_DIR = path.join(ROOT, 'data', 'briefs');
export const INDEX_PATH = path.join(BRIEFS_DIR, 'master_index.md');

const INDEX_HEADER = `# Master Index — Financial Strategy Briefs

A business-facing matrix indexing every brief by demographic cohort and banking
product category. Generated and maintained by the Financial-Demographic-Strategist agent.

| Date (UTC) | Demographic Group | Product Category | Geography | Confidence | Brief |
| --- | --- | --- | --- | --- | --- |
`;

/**
 * @param {object} args
 * @param {string} args.filename            - e.g. 'gta_newcomer_credit_opportunity.md'
 * @param {string} args.target_demographic  - e.g. 'Newcomers to Canada (0–5 yrs), GTA'
 * @param {string} args.banking_product_focus - e.g. 'Newcomer Credit / Daily Banking'
 * @param {string} args.markdown_body       - full brief body (markdown)
 * @param {string} [args.geography='National']
 * @param {string} [args.confidence='High'] - 'High' | 'Low Confidence'
 * @param {string} [args.briefsDir]  - output directory override (defaults to /data/briefs; used by tests).
 */
export async function compileStrategyBrief(args) {
  const {
    filename,
    target_demographic,
    banking_product_focus,
    markdown_body,
    geography = 'National',
    confidence = 'High',
    briefsDir = BRIEFS_DIR,
  } = args;

  for (const [k, v] of Object.entries({ filename, target_demographic, banking_product_focus, markdown_body })) {
    if (!v || !String(v).trim()) throw new Error(`compile_strategy_brief: missing required field \`${k}\`.`);
  }
  if (!/^[\w.-]+\.md$/.test(filename)) {
    throw new Error(`Invalid filename "${filename}". Use a safe kebab-case name ending in .md.`);
  }

  const indexPath = path.join(briefsDir, 'master_index.md');
  await fs.mkdir(briefsDir, { recursive: true });
  const briefPath = path.join(briefsDir, filename);
  await fs.writeFile(briefPath, ensureTrailingNewline(markdown_body), 'utf8');

  // Ensure the index exists with a header, then append the row.
  let index;
  try {
    index = await fs.readFile(indexPath, 'utf8');
  } catch {
    index = INDEX_HEADER;
  }
  if (!index.includes('| Date (UTC) |')) index = INDEX_HEADER;

  const date = new Date().toISOString().slice(0, 10);
  const row = `| ${date} | ${esc(target_demographic)} | ${esc(banking_product_focus)} | ${esc(
    geography
  )} | ${esc(confidence)} | [${filename}](./${filename}) |\n`;

  // De-duplicate: drop any existing row pointing at the same filename.
  index = index
    .split('\n')
    .filter((ln) => !ln.includes(`](./${filename})`))
    .join('\n');
  if (!index.endsWith('\n')) index += '\n';

  await fs.writeFile(indexPath, index + row, 'utf8');

  return {
    written: path.relative(ROOT, briefPath).replace(/\\/g, '/'),
    index: path.relative(ROOT, indexPath).replace(/\\/g, '/'),
    bytes: Buffer.byteLength(markdown_body, 'utf8'),
  };
}

const esc = (s) => String(s).replace(/\|/g, '\\|');
const ensureTrailingNewline = (s) => (s.endsWith('\n') ? s : s + '\n');
