# Financial-Intelligence-Strategy-Agent

An autonomous business-intelligence agent specializing in **Canadian demographic shifts and consumer banking strategy**. It pulls live public data from Statistics Canada, CMHC, and the Bank of Canada, then synthesizes executive **strategy briefs** that map demographic and housing-cost realities to specific retail-banking product opportunities.

> Reports empirical trend realities only. It does **not** forecast interest rates or market crashes, and does **not** provide legal, compliance, or FINTRAC/Bank Act regulatory advice.

## What's inside

```
src/
  mcp/
    server.js                 # MCP server (stdio) exposing the 4 tools below
    adapters/
      statcan.js              # Statistics Canada WDS (household leverage, CPI, coordinate resolver)
      cmhc.js                 # CMHC Rental Market Survey — sourced via StatCan WDS
      bankofcanada.js         # Bank of Canada Valet API (rates, FX)
    tools/
      compile_strategy_brief.js  # writes a brief + updates the master index matrix
  lib/http.js                 # fetch with timeout + retry/backoff
  orchestrator.js             # runs the SOP end-to-end and emits one brief
scripts/smoke.js              # live end-to-end check of every adapter
data/
  raw/                        # JSON provenance snapshots per run
  briefs/                     # generated briefs + master_index.md matrix
memory.md                     # persistent running-state log
```

## Data sources (all public, no API key)

| Source | Access | Used for |
| --- | --- | --- |
| Statistics Canada | [Web Data Service (WDS)](https://www.statcan.gc.ca/en/developers/wds/user-guide) | Household debt-to-income (Table 38-10-0238), CPI (18-10-0004) |
| CMHC | via StatCan WDS (HMIP has no public JSON API) | Average rents (34-10-0133), vacancy (34-10-0127) |
| Bank of Canada | [Valet API](https://www.bankofcanada.ca/valet/docs) | Overnight target, prime, 5-yr mortgage, FX |

## Quick start

```bash
npm install
npm run smoke      # verify all live data adapters
npm run brief      # run the SOP → writes data/briefs/*.md + updates the matrix + memory.md
npm run mcp        # start the MCP server on stdio
```

## MCP tools

| Tool | Purpose |
| --- | --- |
| `query_statcan_financial_behavior` | Household financial-behaviour indicators (debt-to-income, consumer credit, CPI) by curated concept or raw vector. |
| `fetch_cmhc_housing_insights` | CMHC rent/vacancy by Census Metropolitan Area and bedroom type. |
| `fetch_boc_rates` | Bank of Canada rate/FX series, or the full headline rate environment. |
| `compile_strategy_brief` | Write a finished brief to `data/briefs/` and append it to `master_index.md`. |

### Wiring into Claude Code

A project-scoped [`.mcp.json`](./.mcp.json) is included:

```json
{ "mcpServers": { "financial-intelligence-strategy-agent": { "command": "node", "args": ["src/mcp/server.js"] } } }
```

## Standard Operating Procedure (orchestrator)

1. **Identify gaps** — read `data/briefs/master_index.md`.
2. **Gather demographic data** — StatCan household leverage / CPI.
3. **Cross-reference housing cost** — CMHC rents + vacancy for the target CMA.
4. **Strategic synthesis** — compose a brief (Executive Summary → Demographic Profile → Structural Impediments → Product Innovation Opportunities), each section carrying a *Financial Services Implication*.
5. **Write file & matrix** — `compile_strategy_brief`.
6. **Update loop state** — timestamps + confidence to `memory.md`.

**Confidence guardrail:** any series with fewer than 3 years of baseline is flagged `Low Confidence` in `memory.md` and on the console.

## Example output

[`data/briefs/gta_newcomer_credit_opportunity.md`](./data/briefs/gta_newcomer_credit_opportunity.md) — Newcomer Credit & Daily Banking strategy for the Greater Toronto Area, built entirely from live figures.

## License

MIT
