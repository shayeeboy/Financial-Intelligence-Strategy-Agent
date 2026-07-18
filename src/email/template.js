// Pure email builders → { subject, html, text }. No I/O.
// Reuses the browser Markdown renderer; adds inline styles because most email
// clients strip <style>/class-based CSS.

import { renderMarkdown } from '../../web/js/markdown.js';

const BRAND = '#4f46e5';
const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';

// Inline-style the class-less tags renderMarkdown emits, for email clients.
function inlineStyles(html) {
  return html
    .replace(/<h1>/g, `<h1 style="font-size:22px;margin:18px 0 6px;color:${INK}">`)
    .replace(/<h2>/g, `<h2 style="font-size:18px;margin:22px 0 6px;color:${INK}">`)
    .replace(/<h3>/g, `<h3 style="font-size:15px;margin:16px 0 4px;color:${INK}">`)
    .replace(/<hr>/g, `<hr style="border:0;border-top:1px solid ${LINE};margin:18px 0">`)
    .replace(/<blockquote>/g, `<blockquote style="margin:12px 0;padding:8px 14px;border-left:4px solid ${BRAND};background:#f8fafc;color:${MUTED};font-size:13px">`)
    .replace(/<table>/g, `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px" cellpadding="0" cellspacing="0">`)
    .replace(/<th>/g, `<th style="border:1px solid ${LINE};padding:7px 9px;text-align:left;background:#f8fafc">`)
    .replace(/<td>/g, `<td style="border:1px solid ${LINE};padding:7px 9px;text-align:left">`)
    .replace(/<a /g, `<a style="color:${BRAND};text-decoration:none" `);
}

function shell({ title, bodyHtml, footerHtml }) {
  return `<!doctype html><html><body style="margin:0;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};line-height:1.6">
  <div style="max-width:680px;margin:0 auto;padding:24px">
    <div style="background:#fff;border:1px solid ${LINE};border-radius:14px;padding:24px 26px">
      ${bodyHtml}
    </div>
    <p style="color:${MUTED};font-size:12px;text-align:center;margin:16px 8px">${footerHtml}</p>
  </div>
</body></html>`;
}

/** Double opt-in confirmation email. */
export function buildConfirmEmail({ selectionLabel, confirmUrl, unsubUrl }) {
  const bodyHtml = `
    <p style="font-size:13px;color:${MUTED};margin:0 0 6px">🍁 Canadian Banking Intelligence</p>
    <h1 style="font-size:22px;margin:0 0 12px;color:${INK}">Confirm your brief subscription</h1>
    <p>You asked to receive this strategy brief on a schedule:</p>
    <p style="font-weight:600">${escapeHtml(selectionLabel)}</p>
    <p>Click to confirm — nothing is sent until you do:</p>
    <p style="margin:20px 0"><a href="${confirmUrl}" style="background:${BRAND};color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">Confirm subscription</a></p>
    <p style="font-size:12px;color:${MUTED}">If you didn't request this, ignore this email and nothing will happen. You can also <a href="${unsubUrl}" style="color:${MUTED}">cancel</a>.</p>`;
  const text = `Confirm your brief subscription\n\n${selectionLabel}\n\nConfirm: ${confirmUrl}\n\nIf you didn't request this, ignore this email. Cancel: ${unsubUrl}`;
  return {
    subject: 'Confirm your Canadian banking strategy brief',
    html: shell({ title: 'Confirm subscription', bodyHtml, footerHtml: 'You received this because someone entered this address at the Financial Strategy Brief Generator.' }),
    text,
  };
}

/** A scheduled brief email built from the brief's Markdown. */
export function buildBriefEmail({ selectionLabel, briefMarkdown, unsubUrl }) {
  const rendered = inlineStyles(renderMarkdown(briefMarkdown));
  const bodyHtml = `<div>${rendered}</div>`;
  const footerHtml = `You're receiving this on a schedule (${escapeHtml(selectionLabel)}). <a href="${unsubUrl}" style="color:${MUTED}">Unsubscribe</a>.`;
  return {
    subject: firstHeading(briefMarkdown) || 'Your Canadian banking strategy brief',
    html: shell({ title: 'Strategy brief', bodyHtml, footerHtml }),
    text: `${selectionLabel}\n\nView this brief in an HTML-capable client.\n\nUnsubscribe: ${unsubUrl}`,
    unsubUrl,
  };
}

const firstHeading = (md) => (md.match(/^#\s+(.+)$/m) || [])[1]?.trim();
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
