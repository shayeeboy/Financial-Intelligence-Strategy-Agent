#!/usr/bin/env node
// Apply sql/gallery_schema.sql to the Neon database in $DATABASE_URL.
// Run: DATABASE_URL=postgres://... node scripts/migrate-gallery.js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySchema } from '../src/lib/apply-schema.js';

const here = path.dirname(fileURLToPath(import.meta.url));
await applySchema(path.join(here, '..', 'sql', 'gallery_schema.sql'));
