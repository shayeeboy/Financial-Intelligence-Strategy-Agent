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
let lastSelection = null;
let lastConfidence = null;

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
    lastSelection = sel;
    lastConfidence = confidence;
    $('brief').innerHTML = renderMarkdown(markdown);
    $('output').hidden = false;
    $('confidence').textContent = confidence;
    $('confidence').className = 'badge ' + (confidence === 'High' ? 'ok' : 'warn');
    if (API_BASE) { $('add-gallery').hidden = false; $('add-gallery').disabled = false; $('add-gallery').textContent = '📌 Add to gallery'; }
    galleryAddStatus('');
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

// --- Community gallery (R8) --------------------------------------------------
const api = (path) => `${API_BASE.replace(/\/$/, '')}${path}`;
function galleryAddStatus(msg, kind) { const el = $('gallery-add-status'); if (el) { el.textContent = msg || ''; el.className = `status ${kind || ''}`; } }
const timeAgo = (iso) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

async function addToGallery() {
  if (!lastSelection) return;
  const btn = $('add-gallery');
  btn.disabled = true; btn.textContent = 'Adding…';
  try {
    const res = await fetch(api('/api/briefs'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cma_key: lastSelection.cmaKey, bedroom: lastSelection.bedroom,
        demographic: lastSelection.demographicKey, product: lastSelection.productKey,
        confidence: lastConfidence,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { galleryAddStatus('Shared to the community gallery ✓', 'ok'); btn.textContent = '✓ Added'; loadGallery(); }
    else { galleryAddStatus(data.error || `Couldn't add (${res.status}).`, 'warn'); btn.disabled = false; btn.textContent = '📌 Add to gallery'; }
  } catch (e) {
    galleryAddStatus(`Couldn't reach the gallery service: ${e.message}`, 'warn');
    btn.disabled = false; btn.textContent = '📌 Add to gallery';
  }
}

async function loadGallery() {
  if (!API_BASE) return;
  try {
    const res = await fetch(api('/api/briefs?limit=24'));
    if (!res.ok) return; // routes not deployed yet → leave gallery hidden
    const { items, stats } = await res.json();
    if (!items || !items.length) return;
    const catLabel = (o) => `${CMAS[o.cma_key]?.label ?? o.cma_key}`;
    $('gallery-stats').textContent =
      `${stats.total} generated · top city: ${stats.top_city ? (CMAS[stats.top_city]?.label ?? stats.top_city) : '—'}` +
      `${stats.top_product ? ` · top product: ${PRODUCTS[stats.top_product]?.label ?? stats.top_product}` : ''}`;
    const list = $('gallery-list');
    list.innerHTML = '';
    for (const it of items) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'gallery-item';
      card.innerHTML = `<span class="gi-label">${it.label}</span>` +
        `<span class="gi-meta">${it.confidence ? it.confidence + ' · ' : ''}${timeAgo(it.created_at)}</span>`;
      card.addEventListener('click', () => applyGallerySelection(it));
      list.appendChild(card);
    }
    $('gallery').hidden = false;
  } catch { /* network/CORS — keep gallery hidden */ }
}

function applyGallerySelection(it) {
  $('province').value = ''; fillCmas('');
  $('cma').value = it.cma_key;
  $('bedroom').value = it.bedroom;
  $('demographic').value = it.demographic;
  $('product').value = it.product;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  generate();
}

function initGallery() {
  if (!API_BASE) return;
  $('add-gallery').addEventListener('click', addToGallery);
  loadGallery();
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
  initGallery();
});
