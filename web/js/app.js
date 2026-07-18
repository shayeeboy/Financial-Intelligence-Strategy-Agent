// Browser controller: wires the controls, runs the live fetch, composes + renders
// the brief. No backend — every figure is fetched client-side from the public APIs.

import { PROVINCES, CMAS, BEDROOMS, DEMOGRAPHICS, PRODUCTS } from './catalog.js';
import { statcanVector, statcanCoord, bocSeries, VEC, BOC_ID, RENT_PID, VACANCY_PID } from './sources.js';
import { composeBrief } from './compose.js';
import { renderMarkdown } from './markdown.js';
import { API_BASE } from './config.js';

const $ = (id) => document.getElementById(id);
const opt = (v, l) => { const o = document.createElement('option'); o.value = v; o.textContent = l; return o; };

// --- Populate controls -------------------------------------------------------
function fillProvinces() {
  const sel = $('province');
  sel.appendChild(opt('', 'All provinces'));
  PROVINCES.forEach((p) => sel.appendChild(opt(p.key, p.label)));
}
function fillCmas(prov) {
  const sel = $('cma');
  sel.innerHTML = '';
  Object.entries(CMAS)
    .filter(([, c]) => !prov || c.province === prov)
    .forEach(([k, c]) => sel.appendChild(opt(k, `${c.label} (${c.province})`)));
}
function fillStatic() {
  BEDROOMS.forEach((b) => $('bedroom').appendChild(opt(b, `${b} (rent basis)`)));
  $('bedroom').value = 'Two bedroom';
  Object.entries(DEMOGRAPHICS).forEach(([k, d]) => $('demographic').appendChild(opt(k, d.label)));
  Object.entries(PRODUCTS).forEach(([k, p]) => $('product').appendChild(opt(k, p.label)));
}

// --- Data gathering ----------------------------------------------------------
async function gatherData(sel) {
  const cma = CMAS[sel.cmaKey];
  const rentCoord = cma.beds[sel.bedroom];
  const [debt, credit, cpi, rent, vacancy, policy, prime, mtg5] = await Promise.all([
    statcanVector(VEC.debt_to_disposable_income, 16),
    statcanVector(VEC.consumer_credit_mortgage_to_income, 16),
    statcanVector(VEC.cpi_all_items, 40),
    statcanCoord(RENT_PID, rentCoord, 6),
    statcanCoord(VACANCY_PID, cma.vacancyCoord, 6),
    bocSeries(BOC_ID.policy_rate, 2),
    bocSeries(BOC_ID.prime_rate, 2),
    bocSeries(BOC_ID.mortgage_5yr, 2),
  ]);
  return { debt, credit, cpi, rent, vacancy, policy, prime, mtg5 };
}

// --- Generate flow -----------------------------------------------------------
let lastMarkdown = '';

async function generate() {
  const sel = {
    cmaKey: $('cma').value,
    bedroom: $('bedroom').value,
    demographicKey: $('demographic').value,
    productKey: $('product').value,
  };
  if (!sel.cmaKey) return status('Pick a city first.', 'warn');

  setBusy(true);
  status('Fetching live data from Statistics Canada, CMHC & the Bank of Canada…', 'info');
  try {
    const data = await gatherData(sel);
    const { markdown, confidence } = composeBrief(sel, data);
    lastMarkdown = markdown;
    $('brief').innerHTML = renderMarkdown(markdown);
    $('output').hidden = false;
    $('confidence').textContent = confidence;
    $('confidence').className = 'badge ' + (confidence === 'High' ? 'ok' : 'warn');
    status(`Generated from live data · confidence: ${confidence}`, 'ok');
    $('output').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    status(`Generation failed: ${e.message}. The public APIs may be momentarily unavailable — try again.`, 'warn');
  } finally {
    setBusy(false);
  }
}

function download() {
  if (!lastMarkdown) return;
  const sel = { cmaKey: $('cma').value, demographicKey: $('demographic').value, productKey: $('product').value };
  const name = `${sel.cmaKey}_${sel.demographicKey}_${sel.productKey}.md`;
  const blob = new Blob([lastMarkdown], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function copy() {
  if (!lastMarkdown) return;
  try { await navigator.clipboard.writeText(lastMarkdown); status('Markdown copied to clipboard.', 'ok'); }
  catch { status('Copy failed — your browser blocked clipboard access.', 'warn'); }
}

// --- Subscribe (scheduled email delivery) -----------------------------------
function subStatus(msg, kind) { const el = $('sub-status'); el.textContent = msg; el.className = `status ${kind || ''}`; }

async function subscribe() {
  const email = $('sub-email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return subStatus('Enter a valid email address.', 'warn');
  if (!$('cma').value) return subStatus('Pick a city above first.', 'warn');

  const payload = {
    email,
    cma_key: $('cma').value,
    bedroom: $('bedroom').value,
    demographic: $('demographic').value,
    product: $('product').value,
    frequency: $('sub-frequency').value,
  };
  const btn = $('subscribe-btn');
  btn.disabled = true; btn.textContent = 'Subscribing…';
  subStatus('Sending your confirmation email…', 'info');
  try {
    const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/subscribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { subStatus(data.message || 'Check your inbox to confirm your subscription.', 'ok'); $('sub-email').value = ''; }
    else subStatus(data.error || `Subscription failed (${res.status}).`, 'warn');
  } catch (e) {
    subStatus(`Could not reach the subscription service: ${e.message}`, 'warn');
  } finally {
    btn.disabled = false; btn.textContent = 'Subscribe';
  }
}

function initSubscribe() {
  if (!API_BASE) { $('sub-form').hidden = true; $('sub-disabled').hidden = false; return; }
  $('subscribe-btn').addEventListener('click', subscribe);
}

// --- UI helpers --------------------------------------------------------------
function status(msg, kind) { const el = $('status'); el.textContent = msg; el.className = `status ${kind || ''}`; }
function setBusy(b) { $('generate').disabled = b; $('generate').textContent = b ? 'Generating…' : 'Generate brief'; }

// --- Init --------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  fillProvinces();
  fillCmas('');
  fillStatic();
  $('province').addEventListener('change', (e) => fillCmas(e.target.value));
  $('generate').addEventListener('click', generate);
  $('download').addEventListener('click', download);
  $('copy').addEventListener('click', copy);
  initSubscribe();
});
