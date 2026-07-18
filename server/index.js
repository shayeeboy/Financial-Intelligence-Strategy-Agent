// Cloudflare Worker — subscription endpoint for scheduled brief delivery.
// Routes:  POST /api/subscribe   GET /api/confirm?t=  GET /api/unsubscribe?t=
//
// Secrets/vars (wrangler.toml [vars] + `wrangler secret put`):
//   DATABASE_URL     Neon connection string          (secret)
//   RESEND_API_KEY   Resend API key                  (secret)
//   MAIL_FROM        e.g. "Briefs <briefs@domain>"   (var)
//   ALLOWED_ORIGIN   the Pages origin allowed to POST (var)

import { client, insertPending, confirmByToken, unsubscribeByToken, countRecentByEmail } from '../src/email/db.js';
import { validateSubscription, computeNextRun, describeSelection } from '../src/email/subscription.js';
import { buildConfirmEmail } from '../src/email/template.js';
import { sendEmail } from '../src/email/send.js';

const MAX_PER_EMAIL_PER_HOUR = 5;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    try {
      if (url.pathname === '/api/subscribe' && request.method === 'POST') {
        return await handleSubscribe(request, env, url, cors);
      }
      if (url.pathname === '/api/confirm' && request.method === 'GET') {
        return await handleConfirm(env, url);
      }
      if (url.pathname === '/api/unsubscribe' && request.method === 'GET') {
        return await handleUnsubscribe(env, url);
      }
      if (url.pathname === '/api/health') {
        return json({ ok: true }, 200, cors);
      }
      return json({ error: 'Not found' }, 404, cors);
    } catch (err) {
      return json({ error: 'Server error', detail: String(err.message || err) }, 500, cors);
    }
  },
};

async function handleSubscribe(request, env, url, cors) {
  const body = await request.json().catch(() => ({}));
  const v = validateSubscription(body);
  if (!v.ok) return json({ error: v.error }, 400, cors);

  const sql = client(env.DATABASE_URL);

  // Anti-abuse: cap confirmation emails per address per hour.
  if ((await countRecentByEmail(sql, v.value.email)) >= MAX_PER_EMAIL_PER_HOUR) {
    return json({ error: 'Too many recent requests for this email. Try again later.' }, 429, cors);
  }

  const row = await insertPending(sql, v.value);
  const confirmUrl = `${url.origin}/api/confirm?t=${row.confirm_token}`;
  const unsubUrl = `${url.origin}/api/unsubscribe?t=${row.unsub_token}`;

  // If already active, don't re-send a confirm email — just acknowledge.
  if (row.status !== 'active') {
    const email = buildConfirmEmail({ selectionLabel: describeSelection(v.value), confirmUrl, unsubUrl });
    await sendEmail({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM, to: v.value.email, ...email });
  }
  return json({ ok: true, message: 'Check your inbox to confirm your subscription.' }, 202, cors);
}

async function handleConfirm(env, url) {
  const token = url.searchParams.get('t');
  if (!token) return page('Invalid link', 'This confirmation link is missing its token.', 400);
  const sql = client(env.DATABASE_URL);
  const row = await confirmByToken(sql, token, (freq) => computeNextRun(freq));
  if (!row) return page('Link not found', 'This confirmation link is not valid or has expired.', 404);
  return page('Subscription confirmed ✅', 'You\'ll start receiving your brief on schedule. Every email includes an unsubscribe link.', 200);
}

async function handleUnsubscribe(env, url) {
  const token = url.searchParams.get('t');
  if (!token) return page('Invalid link', 'This unsubscribe link is missing its token.', 400);
  const sql = client(env.DATABASE_URL);
  const ok = await unsubscribeByToken(sql, token);
  return ok
    ? page('Unsubscribed', 'You will no longer receive these briefs. You can re-subscribe anytime.', 200)
    : page('Link not found', 'This unsubscribe link is not valid.', 404);
}

// --- helpers ---------------------------------------------------------------
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allow = env.ALLOWED_ORIGIN || '';
  const ok = allow && (allow === '*' || origin === allow);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allow || 'null',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

const json = (obj, status, cors) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...(cors || {}) } });

function page(title, body, status) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
  <body style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f6f8fa;color:#0f172a">
    <div style="max-width:560px;margin:12vh auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;text-align:center">
      <p style="color:#64748b;font-size:13px;margin:0 0 8px">🍁 Financial Strategy Brief Generator</p>
      <h1 style="font-size:24px;margin:0 0 10px">${title}</h1>
      <p style="color:#334155">${body}</p>
      <p style="margin-top:22px"><a href="https://shayeeboy.github.io/Financial-Intelligence-Strategy-Agent/" style="color:#4f46e5;text-decoration:none;font-weight:600">← Back to the generator</a></p>
    </div>
  </body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
