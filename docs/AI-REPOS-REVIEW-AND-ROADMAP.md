# Top-12 AI Repos — Portfolio Review & Learning Roadmap

> **What this is.** A review of the *"Top 12 AI GitHub Repositories"* list against **my
> current AI portfolio**, a ranked read of what's genuinely worth leveraging (and what
> isn't), the benefits and concerns of each, and a phased roadmap of what to **learn** and
> **utilize** — written to extend the existing [README roadmap](../README.md#gaps-and-roadmap)
> (which already ships R1, R4, R6, R8, R9 and lists R2, R3, R5, R7 as open).
>
> **Reviewed:** 2026-09-20 · **Scope:** the 12 repos below, mapped onto
> [Financial-Intelligence-Strategy-Agent](../README.md) and its sibling repos
> (AI-Native Team Diagnostic, Enterprise RAG Assistant, AI Product & Leadership Studio).

---

## TL;DR

- **The portfolio's defining trait is that it is deliberately LLM-*light*.** Briefs are
  composed by **deterministic templates over live, cited public data** — there is no model
  inference on the hot path, no API key, no vector store, and the whole generator runs
  **client-side at $0**. That is a feature (reproducible, forecast-free, no hallucination
  surface), and it is the lens for judging every repo below.
- **The biggest *unclaimed* capabilities in these 12 are:** (1) **local/open-weight LLM
  inference** to add an *optional, grounded* narrative layer at **still-$0** and fully
  private (Ollama, DeepSeek-V3, Open WebUI); (2) **an eval / LLM-judge harness** to close
  the two already-planned quality gaps R3 and R5 (LangChain evals, RAGFlow's grounding
  ideas, CrewAI patterns); (3) **explicit agent orchestration** to finally ship R2
  gap-driven autonomy (CrewAI / LangChain / LangGraph); and (4) **workflow-as-config**
  thinking for the delivery/cron pipeline (n8n, Langflow, Dify).
- **The trap to avoid:** bolting a chatty LLM onto the synthesis step would trade away the
  portfolio's whole credibility story (cited, deterministic, $0). Every LLM adoption below
  is therefore gated behind the **R3 grounding check** and kept on **local/open models**,
  so the guarantees survive.
- **Adopt now (learn + use): Ollama, DeepSeek-V3, an eval harness (LangChain/CrewAI
  patterns), CrewAI.** **Learn / borrow patterns: LangChain, RAGFlow, Langflow, n8n,
  Dify, Gemini CLI, Open WebUI.** **Already using: Claude Code.** No item is a pure "skip."

---

## 1. Current portfolio at a glance (the baseline to compare against)

| Capability | Status today | Where |
|---|---|---|
| Live data adapters (StatCan, CMHC, Bank of Canada) | ✅ shipped, cited, retry/backoff | `src/mcp/adapters/` |
| **MCP tool server** (4 tools over stdio) | ✅ shipped | `src/mcp/server.js` |
| Orchestrator SOP (gather → derive → confidence → synthesize → persist) | ✅ shipped | `src/orchestrator.js` |
| Static client-side web generator ($0, no backend on hot path) | ✅ shipped (GitHub Pages) | `web/` |
| Serverless backend (Cloudflare Worker + Neon) for email + gallery | ✅ shipped, $0/mo | `server/`, `src/email/`, `src/gallery/` |
| Freshness SLA, forecast-free trend deltas, cohort micro-data | ✅ R4 / R6 / R1 | `src/lib/` |
| **LLM inference anywhere in the product** | ❌ **none** — synthesis is string templating | — |
| **Vector store / RAG in *this* repo** | ❌ none (lives in the sibling Enterprise RAG Assistant) | — |
| **Agent framework / multi-step planning loop** | ❌ none — the "orchestrator" is a hard-coded sequence | — |
| **Eval / LLM-judge / grounding check** | ❌ open as **R3** and **R5** | roadmap |
| **Gap-driven autonomy** (pick next brief from coverage holes) | ❌ open as **R2** | roadmap |

**Read of the baseline:** strong on data provenance, delivery, and $0 economics; thin on
*anything model-driven* and on *automated quality measurement*. That is exactly the shape
of the opportunity in the 12 repos.

---

## 2. The 12 repos — one-line verdicts

Verdict key: **ADOPT** (learn *and* wire in) · **LEARN** (borrow patterns / evaluate, no
hard dependency yet) · **USING** (already in the stack).

| # | Repo | What it is | Fit to *this* portfolio | Verdict |
|---|---|---|---|---|
| 1 | **OpenClaw** | "Personal AI agent that lives on your device" (local-first personal agent) | Low direct fit — it's a personal-assistant shell, not a data-synthesis engine. Borrow the *local-first / on-device privacy* posture only. | LEARN |
| 2 | **n8n** | Visual workflow automation with native AI nodes | The email cron + snapshot refresh are already "workflows." n8n is the reference model for expressing them as inspectable graphs; likely overkill to *host*. | LEARN |
| 3 | **Ollama** | Run open-weight LLMs locally | **High.** The clean way to add an *optional* narrative/judge layer at **$0 and fully private** — no API key, no data leaving the box. | **ADOPT** |
| 4 | **Langflow** | Drag-and-drop visual agent builder | Good for *prototyping* an autonomy/eval flow before hand-coding it in Node. Not a runtime dependency for a $0 static product. | LEARN |
| 5 | **Dify** | Full-stack, prod-ready platform for building LLM apps | Reference architecture for prompt/versioning/observability if the portfolio ever needs a hosted LLM app. Heavy to self-host for now. | LEARN |
| 6 | **LangChain** | Foundational agent/LLM framework | **High as a pattern source** — its eval + LLM-judge + retriever abstractions map directly onto R3/R5. Adopt *patterns*, resist pulling the whole dependency into a lean ESM repo. | ADOPT (patterns) |
| 7 | **Open WebUI** | Self-hosted, offline ChatGPT alternative | Pairs with Ollama as the local "cockpit" for iterating on brief-narrative prompts privately. Dev-tool, not a shipped dependency. | LEARN |
| 8 | **DeepSeek-V3** | Open-weight frontier-class LLM | **High.** The open model to run *via Ollama* for grounded narrative + as the R3/R5 judge — capable, permissively licensed, $0. | **ADOPT** |
| 9 | **Gemini CLI** | Google's open-source CLI to drive Gemini | Multi-model dev ergonomics + a generous free tier; a cheap *second opinion* model for eval cross-checking. Complements Claude Code. | LEARN |
| 10 | **RAGFlow** | Enterprise-grade RAG engine (deep-doc parsing, grounded citation) | **High relevance to the sibling Enterprise RAG Assistant**, and its *citation-grounding* discipline is exactly the R3 bar. Borrow the grounding method here; consider the engine there. | ADOPT (patterns) |
| 11 | **Claude Code** | Agentic coding tool that understands the whole codebase | **Already the build tool for this work.** Lever it harder: eval scaffolding, adapter generation, CI review. | **USING** |
| 12 | **CrewAI** | Lightweight library to assemble a *team* of agents | **High.** The lightest credible path to R2: a small crew (Gap-Scout → Data-Gatherer → Synthesist → Critic) that picks and QAs the next brief. | **ADOPT** |

> **Note on #1 "OpenClaw":** this name isn't a widely-established AI project; the card's own
> description ("personal AI agent that lives on your device") is what's reviewed here. Verify
> the exact repo before depending on it — treat it as representative of the *local-first
> personal-agent* category, not a specific pinned dependency.

---

## 3. Top things to leverage that are **not** in the portfolio today

Ranked by leverage-for-effort against *this* codebase.

### ① A **local, open-weight LLM narrative + judge layer** — Ollama + DeepSeek-V3
**Gap it fills:** the product has zero model inference; synthesis is pure templating. That's
great for numbers but means the prose is fixed. A *local* model unlocks (a) an optional
richer narrative and (b) the **LLM-judge for R3/R5** — **without** breaking the $0 or
privacy story, because nothing leaves the machine and there's no API bill.
- **Use it two ways:** as an **offline judge** in CI (score/flag briefs, detect any
  quantitative claim not backed by a snapshot figure — this *is* R3) and, optionally, as a
  **grounded rewrite** of template prose where every number is still injected from data.
- **Why local specifically:** preserves "**API cost: $0 (public data)**" and adds "**no
  PII/data egress**" — a genuinely differentiating, honest claim for a financial-services
  audience.

### ② An **eval / grounding harness** — LangChain eval patterns + RAGFlow's citation discipline
**Gap it fills:** R3 (narrative grounding check) and R5 (rubric-scored brief eval) are both
*open* and are the portfolio's most credible next quality story. These repos supply the
**method**, not necessarily the dependency: labeled sample → rubric (completeness, sourcing,
actionability) → judge model → scored, CI-gated report with variance.
- Borrow LangChain's **LLM-as-judge / criteria-eval** structure and RAGFlow's rule that
  **every asserted fact must resolve to a cited source span** — apply it to "every number in
  the prose must resolve to a series in the snapshot."

### ③ **Explicit multi-agent orchestration** — CrewAI (and LangGraph concepts)
**Gap it fills:** R2 gap-driven autonomy. Today `orchestrator.js` runs a *hard-coded target*.
A small **role-based crew** — Gap-Scout (reads `master_index` coverage holes) → Data-Gatherer
(existing adapters) → Synthesist (composer) → Critic (the R3 judge) — turns the SOP into a
**planning loop** that picks its own next brief and self-QAs before writing.
- CrewAI is the lightest fit; you don't have to adopt its runtime — the **role/handoff/critic
  pattern** can be implemented in plain Node to keep the lean-ESM ethos.

### ④ **Workflow-as-inspectable-graph** thinking — n8n / Langflow / Dify
**Gap it fills:** the delivery cron, snapshot refresh, and (future) autonomy loop are
*implicit* in scripts + YAML. These tools model such pipelines as **explicit graphs** with
retries, branching, and observability. **Borrow the mental model** (and maybe Langflow for
*prototyping* the autonomy/eval flow) rather than hosting a heavy platform — a $0 static
product shouldn't take on a stateful workflow server it doesn't need.

### ⑤ **A cheap second-opinion model + sharper dev loop** — Gemini CLI + Claude Code + Open WebUI
**Gap it fills:** eval robustness and build velocity. A **second judge model** (Gemini free
tier, or a second local model in Open WebUI) makes R3/R5 scores more trustworthy via
cross-model agreement. **Claude Code** (already in use) should be pushed harder on eval
scaffolding, adapter generation, and CI review.

---

## 4. Benefits & concerns (for the items actually recommended)

| Item | Concrete benefit here | Concerns / risks to manage |
|---|---|---|
| **Ollama (local runtime)** | $0, private, offline LLM judge + optional narrative; no key, no egress | Local compute/RAM cost; model output non-determinism → **must** stay behind the R3 grounding gate; adds an optional (not required) dependency — keep it off the static hot path |
| **DeepSeek-V3 (open model)** | Frontier-ish quality at $0; permissive open weights; good judge | Large footprint for full weights (use a quantized/distilled variant locally); verify license terms for any redistribution; still hallucinates → gated by grounding check |
| **LLM-judge / eval harness (LangChain/RAGFlow patterns)** | Ships R3 + R5; CI-gated quality regression; honest, measurable metric | Judge can be wrong → need a labeled gold set + cross-model check; risk of "eval theater" if the rubric isn't tied to real analyst usefulness |
| **CrewAI / agent loop** | Ships R2 autonomy; self-QA before publish; less manual targeting | Over-engineering risk vs. a plain Node loop; non-determinism & cost if it calls models per step — cap steps, prefer local model, keep adapters deterministic |
| **RAGFlow (patterns; engine in sibling repo)** | Citation-grounding rigor; directly upgrades the Enterprise RAG Assistant | Heavy to self-host (DB + parsing services); scope it to the RAG sibling, not this $0 repo |
| **n8n / Langflow / Dify (patterns / prototyping)** | Clearer, observable pipelines; fast visual prototyping | Self-hosting = servers, state, ops cost — **contradicts the $0 static ethos** if adopted as runtime; keep as design reference / local prototyping only |
| **Gemini CLI (second model)** | Cheap cross-check for eval; multi-model ergonomics | Free-tier quota + data-handling terms (don't send anything sensitive); keep as a dev/eval aid, not a shipped dependency |
| **Open WebUI (local cockpit)** | Private prompt-iteration UI over Ollama | Self-hosted surface to maintain; dev-only, never in the delivered product |
| **Claude Code (in use)** | Whole-repo agentic edits, eval scaffolding, CI review | Keep human review on generated adapters/evals; never let generated prose bypass the grounding gate |

**Cross-cutting concerns to hold the line on:**
1. **Don't lose the $0 / static / cited identity.** Anything requiring an always-on server,
   a paid API on the hot path, or un-cited prose is a regression, not a feature.
2. **Hallucination surface.** The moment an LLM writes prose, R3 (grounding check) stops
   being optional — it becomes a **release gate**.
3. **Determinism of numbers.** Models may shape *words*; **every figure stays injected from
   the deterministic adapters + snapshot**. No model-authored numbers, ever.
4. **Licensing & data egress.** Prefer local/open models; verify weights' licenses; keep
   financial/PII data on-box.
5. **Maintenance budget.** A solo portfolio can't operate n8n + Dify + RAGFlow servers.
   Favor **patterns and local tools** over hosted platforms.

---

## 5. The roadmap — what to learn & utilize (phased)

Continues the README's numbering (R1–R9 exist). Each item keeps the repo's convention of a
crisp acceptance signal. Phases are ordered by *leverage ÷ risk*, and every LLM item is
gated by the grounding check.

### Phase 0 — Learn (time-boxed spikes, no shipped dependency)
- **Stand up Ollama + a DeepSeek-V3 (quantized) model locally**; drive it from **Open WebUI**.
  Goal: prove a local model can *judge* an existing brief (flag any number not in the
  snapshot) at $0. *Signal:* one brief scored locally, offline, key-free.
- **Read the eval playbooks:** LangChain criteria/LLM-judge evals + RAGFlow's citation
  grounding. Write a one-page rubric (completeness · sourcing · actionability). *Signal:*
  rubric committed to `docs/`.
- **Prototype the autonomy loop in Langflow** (Gap-Scout → Gather → Synthesize → Critic) to
  validate the shape before coding it in Node. *Signal:* a screenshot + a decision note.

### Phase 1 — Ship the quality gates (closes the two open LLM roadmap items)
- **R3 — Narrative grounding check (LLM-judge).** A CI/offline pass (local Ollama model)
  that flags any quantitative claim in brief prose lacking a backing figure in the snapshot.
  *Signal (from README):* hallucinated-claim rate → target 0 on a labeled sample; **$0,
  offline, gated in CI.**
- **R5 — Brief eval harness.** Rubric-scored run over ≥20 briefs; mean score + variance;
  **regression-gated in CI**. Add a **second-model cross-check** (Gemini CLI free tier or a
  second local model) to reduce single-judge bias. *Signal:* CI fails if mean rubric score
  regresses.

### Phase 2 — Autonomy (ships the last big open item)
- **R2 — Gap-driven autonomy via a lightweight crew.** Implement the Gap-Scout → Gatherer →
  Synthesist → **Critic (R3 judge)** loop (CrewAI patterns, plain-Node runtime). The
  orchestrator picks its next brief from `master_index` coverage holes and **self-QAs before
  writing**. *Signal (from README):* briefs generated unattended; matrix coverage across N
  demographics × M products, with each publish having passed the grounding gate.

### Phase 3 — Optional model-shaped narrative (only after gates are green)
- **R10 (new) — Optional grounded narrative layer.** A local model may *rephrase* template
  prose for readability; **all numbers stay injected**, and output must pass R3 or it's
  discarded and the deterministic template is kept. Ships **off by default**, `$0`, private.
  *Signal:* narrative variant that never introduces an un-cited number (0 grounding failures
  on the eval set), template remains the safe fallback.

### Phase 4 — Sibling-repo leverage (spread the wins)
- **R11 (new) — RAGFlow-grade grounding in the Enterprise RAG Assistant.** Bring RAGFlow's
  deep-doc parsing + span-level citation discipline to the sibling repo; reuse the R3 judge
  as its answer-grounding check. *Signal:* every RAG answer resolves to a cited source span.
- **R12 (new) — Local-model option across the portfolio.** Offer Ollama/DeepSeek as the
  drop-in local backend for the sibling agents (diagnostic, RAG), giving the whole portfolio
  a **"runs private + offline + $0"** story. *Signal:* one sibling agent demonstrably runs
  with no external API.

### Non-goals (explicitly *not* on the roadmap)
- Self-hosting n8n / Dify / RAGFlow **as runtime infra for this repo** — contradicts the $0
  static ethos; kept as patterns/prototyping only.
- Any **paid LLM API on the generation hot path** — would break the headline $0 guarantee.
- **Model-authored numbers** — numbers are always deterministic-adapter output.

---

## 6. Guardrails to preserve while adopting any of the above

1. **Numbers are deterministic; only words may be model-shaped** — and only behind R3.
2. **$0 and static-first stays the default path** — LLM features are optional, local, and
   off the hot path.
3. **Everything cited** — no claim ships without a resolvable source (the RAGFlow bar).
4. **Forecast-free + no legal/FINTRAC advice** — unchanged; the model never gets to opine on
   rates or compliance.
5. **Privacy** — prefer local/open models so financial data never leaves the machine.

---

*Companion to the [main README](../README.md) and its
[Gaps & roadmap](../README.md#gaps-and-roadmap). This document is a review/plan — it adds no
runtime dependencies by itself.*
