// Runtime config for the static app.
//
// API_BASE — origin of the deployed Cloudflare Worker that handles email
// subscriptions (e.g. "https://fisa-subscriptions.<account>.workers.dev").
// Leave empty until the Worker is deployed; the subscribe panel then shows a
// "not yet activated" note instead of a broken form.
export const API_BASE = '';
