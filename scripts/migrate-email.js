#!/usr/bin/env node
// Apply sql/email_schema.sql to the Neon database in $DATABASE_URL.
// Run: DATABASE_URL=postgres://... node scripts/migrate-email.js
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) { console.error('Set DATABASE_URL first.'); process.exit(1); }

const here = path.dirname(fileURLToPath(import.meta.url));
const ddl = await readFile(path.join(here, '..', 'sql', 'email_schema.sql'), 'utf8');

const sql = neon(DATABASE_URL);
// Split on statement boundaries (simple; our DDL has no semicolons inside bodies).
const statements = ddl.split(/;\s*$/m).map((s) => s.trim()).filter((s) => s && !s.startsWith('--'));
for (const stmt of statements) {
  await sql.query(stmt);
  console.log('✓', stmt.split('\n')[0].slice(0, 70));
}
console.log('Migration complete.');
