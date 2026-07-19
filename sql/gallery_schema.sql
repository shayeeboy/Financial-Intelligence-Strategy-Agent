-- Shared brief gallery (R8) — persists which briefs people generate, for a public
-- "recently generated" feed + usage stats. No PII: only the selection + a hashed IP
-- (for rate-limiting). Apply with:  node scripts/migrate-gallery.js  ($DATABASE_URL)

create table if not exists briefs (
  id           uuid        primary key default gen_random_uuid(),
  cma_key      text        not null,
  bedroom      text        not null default 'Two bedroom',
  demographic  text        not null,
  product      text        not null,
  confidence   text,
  ip_hash      text,                          -- sha256(salt+ip), rate-limit only; not reversible
  created_at   timestamptz not null default now()
);

create index if not exists idx_briefs_recent on briefs (created_at desc);
create index if not exists idx_briefs_iphash on briefs (ip_hash, created_at);
