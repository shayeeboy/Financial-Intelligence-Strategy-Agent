# Financial-Demographic-Strategist — Running State Log

Last Execution: 2026-08-27 20:55 UTC

## Active Ingestion Vectors
- [x] StatCan Table 38-10-0238: Household credit-market debt to disposable income → 179.55% @ 2026-01-01
- [x] StatCan Table 18-10-0004: CPI all-items → 169.9 @ 2026-07-01
- [x] CMHC Table 34-10-0133 (via StatCan): Toronto avg 2BR rent → $2,045 @ 2025-01-01
- [x] CMHC Table 34-10-0127 (via StatCan): Toronto vacancy → 3.00% @ 2025-01-01
- [x] Bank of Canada Valet: overnight target → 2.25% @ 2026-08-10

## Strategy Briefs Generated
- /data/briefs/gta_newcomer_credit_opportunity.md (Product: Newcomer Credit & Daily Banking) — Confidence: High

## Data Provenance
- Raw snapshot: /data/raw/snapshot_gta_newcomer_credit_opportunity.json

## Confidence / Escalation
- Baseline check: OK — all series carry ≥3yr baseline.

## Freshness SLA
- Within SLA: **7/8** series inside one release cycle of their source. ⚠️ STALE: mtg5 — a newer release may be available.
- [x] debt (quarterly): 238d old · SLA 280d
- [x] credit (quarterly): 238d old · SLA 280d
- [x] cpi (monthly): 57d old · SLA 95d
- [x] rent2br (annual (CMHC RMS)): 603d old · SLA 730d
- [x] vacancy (annual (CMHC RMS)): 603d old · SLA 730d
- [x] policy (as-announced): 17d old · SLA 120d
- [x] prime (as-announced): 85d old · SLA 120d
- ⚠️ mtg5 (weekly): 85d old · SLA 45d — STALE, check for a newer release

## Immediate Backlog Priority
- Cross-reference Gen Z digital-payment behaviours with credit-union membership data in British Columbia.
- Add StatCan newcomer-specific income/credit vectors to CONCEPT_VECTORS for cohort-level (not national) figures.
