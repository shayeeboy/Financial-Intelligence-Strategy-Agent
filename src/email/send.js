// Email sending via the Resend REST API using fetch (works in both the
// Cloudflare Worker and Node/GitHub Actions — no SDK, no runtime-specific deps).
// Swap this one file for a Brevo/SES implementation to change providers.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * @param {object} args
 * @param {string} args.apiKey   Resend API key (from env/secret).
 * @param {string} args.from     e.g. "Briefs <briefs@your-domain>".
 * @param {string} args.to
 * @param {string} args.subject
 * @param {string} args.html
 * @param {string} [args.text]
 * @param {string} [args.unsubUrl]  adds a one-click List-Unsubscribe header.
 * @returns {Promise<{id:string}>}
 */
export async function sendEmail({ apiKey, from, to, subject, html, text, unsubUrl }) {
  if (!apiKey) throw new Error('sendEmail: missing Resend API key');
  const headers = {};
  if (unsubUrl) {
    headers['List-Unsubscribe'] = `<${unsubUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text, headers }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Resend ${res.status}: ${body?.message || JSON.stringify(body)}`);
  }
  return body; // { id }
}
