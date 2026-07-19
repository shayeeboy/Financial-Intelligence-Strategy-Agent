// Neon queries for the shared brief gallery (R8). Each takes an `sql` tag
// (built by src/email/db.js `client()`), so it runs in the Worker and in Node.

/** Insert a gallery entry; returns { id, created_at }. */
export async function insertBrief(sql, e, ipHash = null) {
  const rows = await sql`
    insert into briefs (cma_key, bedroom, demographic, product, confidence, ip_hash)
    values (${e.cma_key}, ${e.bedroom}, ${e.demographic}, ${e.product}, ${e.confidence}, ${ipHash})
    returning id, created_at`;
  return rows[0];
}

/** Most recent gallery entries (no ip_hash exposed). */
export async function recentBriefs(sql, limit = 24) {
  const n = Math.min(Math.max(Number(limit) || 24, 1), 60);
  return sql`
    select id, cma_key, bedroom, demographic, product, confidence, created_at
      from briefs
     order by created_at desc
     limit ${n}`;
}

/** Aggregate usage stats: total + most popular city/product. */
export async function galleryStats(sql) {
  const [tot] = await sql`select count(*)::int as n from briefs`;
  const [city] = await sql`select cma_key, count(*)::int as n from briefs group by cma_key order by n desc limit 1`;
  const [prod] = await sql`select product, count(*)::int as n from briefs group by product order by n desc limit 1`;
  return {
    total: tot?.n ?? 0,
    top_city: city?.cma_key ?? null,
    top_product: prod?.product ?? null,
  };
}

/** Anti-abuse: how many entries this hashed IP created in the last hour. */
export async function countRecentByIpHash(sql, ipHash) {
  if (!ipHash) return 0;
  const rows = await sql`
    select count(*)::int as n from briefs
     where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'`;
  return rows[0]?.n ?? 0;
}
