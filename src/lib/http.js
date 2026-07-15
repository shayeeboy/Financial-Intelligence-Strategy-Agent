// Shared HTTP helpers for the data adapters.
// Uses global fetch (Node >= 18). Adds timeout, retry with backoff, and a
// descriptive User-Agent so upstream open-data services can identify the client.

const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_RETRIES = 2;
const UA =
  'Financial-Intelligence-Strategy-Agent/0.1 (+https://github.com/shayeeboy/Financial-Intelligence-Strategy-Agent)';

/**
 * Fetch JSON with timeout + retry/backoff.
 * @param {string} url
 * @param {object} [opts] - standard fetch options plus { timeoutMs, retries }.
 * @returns {Promise<any>} parsed JSON
 */
export async function fetchJson(url, opts = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, ...init } = opts;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers || {}) },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await sleep(400 * Math.pow(2, attempt)); // 400ms, 800ms
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Request failed after ${retries + 1} attempt(s): ${lastErr?.message}`);
}

export async function postJson(url, body, opts = {}) {
  return fetchJson(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...opts,
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
