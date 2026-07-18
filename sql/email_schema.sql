-- Scheduled email delivery — subscriptions table (Neon Postgres).
-- Apply with:  node scripts/migrate-email.js      (uses $DATABASE_URL)
--         or:  psql "$DATABASE_URL" -f sql/email_schema.sql

create table if not exists subscriptions (
  id             uuid primary key default gen_random_uuid(),
  email          text        not null,
  -- brief selection (values mirror web/js/catalog.js keys)
  cma_key        text        not null,
  bedroom        text        not null default 'Two bedroom',
  demographic    text        not null,
  product        text        not null,
  frequency      text        not null check (frequency in ('weekly','monthly')),
  -- lifecycle
  status         text        not null default 'pending'
                   check (status in ('pending','active','unsubscribed')),
  confirm_token  uuid        not null default gen_random_uuid(),
  unsub_token    uuid        not null default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  confirmed_at   timestamptz,
  next_run       timestamptz,
  last_sent_at   timestamptz,
  send_count     int         not null default 0,
  last_error     text
);

-- Cheap "who is due" scan for the cron job.
create index if not exists idx_sub_due
  on subscriptions (next_run) where status = 'active';

-- Token lookups (confirm / unsubscribe links).
create index if not exists idx_sub_confirm on subscriptions (confirm_token);
create index if not exists idx_sub_unsub   on subscriptions (unsub_token);

-- One active subscription per (email, exact brief config). Re-subscribe allowed
-- after unsubscribe because unsubscribed rows are excluded from the constraint.
create unique index if not exists idx_sub_unique_active
  on subscriptions (email, cma_key, bedroom, demographic, product, frequency)
  where status <> 'unsubscribed';
