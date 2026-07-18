// Neon Postgres data access for subscriptions.
// Uses @neondatabase/serverless, which runs over fetch/WebSocket in BOTH the
// Cloudflare Worker and Node (GitHub Actions) — one driver for both runtimes.

import { neon } from '@neondatabase/serverless';

/** Build a SQL tag bound to a connection string. */
export const client = (databaseUrl) => neon(databaseUrl);

/**
 * Insert a pending subscription (idempotent-ish: if an identical active/pending
 * row exists, return it instead of erroring on the unique index).
 * @returns {Promise<{id, confirm_token, unsub_token, status}>}
 */
export async function insertPending(sql, sub) {
  const rows = await sql`
    insert into subscriptions (email, cma_key, bedroom, demographic, product, frequency)
    values (${sub.email}, ${sub.cma_key}, ${sub.bedroom}, ${sub.demographic}, ${sub.product}, ${sub.frequency})
    on conflict (email, cma_key, bedroom, demographic, product, frequency)
      where status <> 'unsubscribed'
      do update set email = excluded.email  -- no-op that lets us RETURNING the existing row
    returning id, confirm_token, unsub_token, status`;
  return rows[0];
}

/**
 * Confirm by token → active. Sets next_run from the row's own frequency.
 * @param {(freq:string)=>Date} nextRunFor  computeNextRun-style fn.
 * @returns {Promise<object|undefined>} the confirmed (or already-confirmed) row.
 */
export async function confirmByToken(sql, token, nextRunFor) {
  const pending = await sql`select id, frequency from subscriptions where confirm_token = ${token} and status = 'pending'`;
  if (pending[0]) {
    const nextRun = nextRunFor(pending[0].frequency);
    const rows = await sql`
      update subscriptions
         set status = 'active', confirmed_at = now(), next_run = ${nextRun.toISOString()}
       where id = ${pending[0].id}
      returning id, email, frequency, unsub_token`;
    return rows[0];
  }
  // Already-confirmed / unknown token → safe idempotent no-op.
  const existing = await sql`select id, status from subscriptions where confirm_token = ${token}`;
  return existing[0] ? { ...existing[0], alreadyConfirmed: true } : undefined;
}

/** Unsubscribe by token (idempotent). Returns true if a row matched. */
export async function unsubscribeByToken(sql, token) {
  const rows = await sql`
    update subscriptions set status = 'unsubscribed'
     where unsub_token = ${token} and status <> 'unsubscribed'
    returning id`;
  if (rows[0]) return true;
  const existing = await sql`select id from subscriptions where unsub_token = ${token}`;
  return existing.length > 0; // token exists (already unsubscribed) → still success
}

/** Active subscriptions whose next_run is due. */
export async function dueSubscriptions(sql, now = new Date()) {
  return sql`
    select id, email, cma_key, bedroom, demographic, product, frequency, unsub_token
      from subscriptions
     where status = 'active' and next_run <= ${now.toISOString()}
     order by next_run asc
     limit 100`;
}

export async function markSent(sql, id, nextRun) {
  await sql`
    update subscriptions
       set last_sent_at = now(), send_count = send_count + 1,
           next_run = ${nextRun.toISOString()}, last_error = null
     where id = ${id}`;
}

export async function markError(sql, id, message) {
  await sql`update subscriptions set last_error = ${String(message).slice(0, 500)} where id = ${id}`;
}

/** Anti-abuse: how many subscriptions this email created in the last hour. */
export async function countRecentByEmail(sql, email) {
  const rows = await sql`
    select count(*)::int as n from subscriptions
     where email = ${email} and created_at > now() - interval '1 hour'`;
  return rows[0]?.n ?? 0;
}
