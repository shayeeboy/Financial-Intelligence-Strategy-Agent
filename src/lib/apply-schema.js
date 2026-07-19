// Apply a .sql schema file to Neon via the serverless HTTP driver.
// Shared by scripts/migrate-email.js and scripts/migrate-gallery.js.

import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

export async function applySchema(sqlFilePath, databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    console.error('Set DATABASE_URL first.');
    process.exit(1);
  }
  const ddl = await readFile(sqlFilePath, 'utf8');
  const sql = neon(databaseUrl);

  // This driver's `sql` is a tagged-template function (no `.query()`), so wrap
  // each raw statement in a proper TemplateStringsArray to run it over HTTPS.
  const runRaw = (text) => sql(Object.assign([text], { raw: [text] }));

  const statements = ddl
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim()) // drop comment-only lines
    .filter(Boolean);

  for (const stmt of statements) {
    await runRaw(stmt);
    console.log('✓', stmt.split('\n')[0].slice(0, 70));
  }
  console.log('Migration complete.');
}
