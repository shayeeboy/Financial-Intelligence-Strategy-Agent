# Data Sources & Vector Registry

Every figure this agent reports is pulled live, at generation time, from a public
Canadian open-data API — no API keys, no scraping of rendered pages, no
third-party estimates. This document is the provenance reference: which tables,
which vectors, and how to extend the registry.

## Why CMHC is sourced through Statistics Canada

CMHC's [Housing Market Information Portal (HMIP)](https://www03.cmhc-schl.gc.ca/hmip-pimh/)
renders its tables as HTML and exposes **no stable public JSON API** — probing the
`TableMapChart` endpoints returns a web page, not data. CMHC's authoritative Rental
Market Survey results are, however, **republished as Statistics Canada cubes** on
CMHC's own release schedule. We therefore read CMHC-origin data through the StatCan
WDS: versioned, machine-readable, and citable. This is a deliberate, documented
trade-off — see the README's *Key decisions*.

## Tables & series in use

| Source | Table / Series | Concept | Adapter |
|---|---|---|---|
| Statistics Canada WDS | [38-10-0238](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3810023801) | Household credit-market debt ÷ disposable income; consumer credit + mortgage ÷ income | `statcan.js` |
| Statistics Canada WDS | [18-10-0004](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401) | Consumer Price Index, all-items | `statcan.js` |
| CMHC (via StatCan WDS) | [34-10-0133](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3410013301) | Average rents, areas 10,000+ | `cmhc.js` |
| CMHC (via StatCan WDS) | [34-10-0127](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3410012701) | Rental vacancy rates | `cmhc.js` |
| Bank of Canada Valet | `V39079`, `V80691311`, `V80691335`, `FXUSDCAD` | Overnight target, prime, conventional 5-yr mortgage, USD/CAD | `bankofcanada.js` |

## Two ways the StatCan adapter resolves data

1. **Curated concept → vector** (`CONCEPT_VECTORS` in `src/mcp/adapters/statcan.js`).
   Each vector is validated against the live WDS by `npm run smoke`. Fast and exact.
2. **Table + selectors → coordinate** (`resolveCoordinate` + `getCoordData`). Given a
   cube's metadata, human-readable selectors (e.g. `['Toronto', null, 'Two bedroom units']`)
   are matched to member IDs and assembled into the 10-part coordinate WDS expects.
   This is how `cmhc.js` reaches any CMA/bedroom combination without hard-coding
   thousands of vector IDs.

## Adding a new indicator

To add, say, a household-savings-rate concept:

1. Find the StatCan table and, via `getCubeMetadata(productId)`, the vector or
   coordinate for the series you want.
2. Add an entry to `CONCEPT_VECTORS` with `{ vectorId, table_id, label }`.
3. Add a line to `scripts/smoke.js` so the new vector is validated live.
4. Run `npm run smoke` — a wrong vector shows up immediately as a `null`/stale value.

## Verified live values (last check)

Snapshotted for reference; regenerate anytime with `npm run smoke`.

| Indicator | Value | As of |
|---|---|---|
| Household debt ÷ disposable income | ~179.6% | 2026-Q1 |
| Consumer credit + mortgage ÷ income | ~171.2% | 2026-Q1 |
| Toronto CMA avg 2-bedroom rent | ~$2,045/mo | 2025 |
| Toronto CMA vacancy rate | ~3.0% | 2025 |
| BoC overnight target / prime / 5-yr mtg | 2.25% / 4.45% / 6.09% | 2026-07 |

> Values move as the sources publish; the numbers above are a point-in-time
> snapshot, not a hard-coded fixture. The brief always reports the live pull.
