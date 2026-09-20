# Top-12 AI Repos — **Portfolio-Wide** Review & Learning Roadmap

> **Scope.** A review of the *"Top 12 AI GitHub Repositories"* list against the **entire AI
> portfolio** — all five AI repos, not just this one — with per-repo verdicts, a capability
> coverage matrix, the genuinely net-new things worth leveraging, deliberate non-adopts
> (with rationale), and a portfolio-level roadmap.
>
> **Reviewed:** 2026-09-20 · **Authored in** this repo because that's where the working
> branch lives; the artifact is portfolio-wide and its natural long-term home is the
> [AI Product & Leadership Studio](https://github.com/shayeeboy/AI-Product-Leadership-Studio)
> or [shayzone-ai-os](https://github.com/shayeeboy/shayzone-ai-os).
>
> **Supersedes** the initial single-repo pass of this document: that version judged only the
> Financial-Intelligence-Strategy-Agent (which is deliberately LLM-light) and therefore
> recommended adding local LLM inference, an LLM-judge, and agents — all of which, seen
> **portfolio-wide, already exist** in the RAG assistant and shayzone-ai-os. The corrected
> thesis is below.

---

## TL;DR — the honest headline

**Your portfolio has already independently out-built most of this top-12 list**, and in
several places to a *higher* standard than the tools themselves imply. Concretely, across
the five repos you already run: **local open-weight LLM inference (Ollama, as the RAG
assistant's default provider), local embeddings (`@xenova/transformers`), a pgvector store,
a full production RAG pipeline (hybrid retrieve → rerank → rewrite → NLI-grounded guardrails
→ gate), a deterministic cross-model LLM-as-judge, an eval + golden-set + gate loop,
observability + a cost ledger, a five-role agent crew (orchestrator / researcher /
strategist / critic / executive-synthesizer), an MCP tool server, a governance spine (risk
tiers, approval matrix, data classification, ADR log), and a portfolio-integration layer
with RICE/WSJF/ROI scoring.**

So the useful output of this exercise is **not** "adopt these 12." It is:

1. **Validation / positioning** — you converged on the same architecture as the leading OSS
   tools, by hand, at ~$0. That is a *stronger* Director/VP-of-AI proof than using them.
2. **Consolidation** — the same capability is re-implemented per repo. The leverage is to
   promote the best implementation into **shayzone-ai-os as the shared standard** and have
   the others consume it (this is already the OS's stated purpose).
3. **A short list of genuinely net-new adds** — DeepSeek-V3 as a model option, RAGFlow-grade
   deep-document parsing for the RAG assistant, Gemini CLI as a second free judge model, and
   Open WebUI as a local cockpit over the Ollama you *already* run.
4. **Deliberate, documented non-adopts** — LangChain, LangGraph, CrewAI, Dify, n8n, Langflow
   and OpenClaw as runtime dependencies, because they'd fight the portfolio's proven
   "code-native, $0, *the product is the system, not the framework*" ethos. Knowing what to
   **reject** is itself the leadership signal.

---

## 1. The portfolio you're actually comparing against

| Repo | What it is | AI capabilities it already ships |
|---|---|---|
| **Enterprise-RAG-Assistant** | Production-shaped RAG over a real corpus | **Ollama local LLM (default provider, provider-agnostic)**, local embeddings (`@xenova/transformers`), **pgvector/Neon**, hybrid retrieval, **rerank**, query **rewrite**, **NLI-grounded** faithfulness (`nli.js`), refusal **guardrails** + **gate**, **deterministic cross-model LLM-judge** (`judge.js`), nightly **eval** + golden set, **observability** + per-request cost/latency. `src/rag/*` |
| **shayzone-ai-os** | Private, Claude-Code-native "AI operating system" for the studio | **5-role agent crew** (`.claude/agents/`: orchestrator, researcher, strategist, critic, executive-synthesizer), **skills** + **hooks**, **eval-and-gate** loop (`eval/` + golden), **governance spine** (`governance/`: risk-tiers, approval-matrix, data-classification, ADR log), **context layer**, **observability + economics** (cost ledger), **portfolio contracts** + freshness. Phases 0–8 done; one governed vertical slice, 5 approved runs. |
| **AI-Product-Leadership-Studio** | Executive platform to govern/fund/evaluate the *portfolio* | React 18/Vite 5/TS, **live integration** of the three engines via snapshot endpoints, **RICE/WSJF/ROI/opportunity/maturity scoring** (`src/lib/scoring.ts`), governance + responsible-AI, Vitest + Playwright, $0 static. |
| **Financial-Intelligence-Strategy-Agent** | Autonomous BI agent → cited banking strategy briefs | **MCP tool server** (4 tools), live StatCan/CMHC/BoC adapters, deterministic template synthesis, freshness SLA, forecast-free trends, email + gallery. **Deliberately LLM-light.** |
| **ai-native-diagnostic** | Self-scoring AI-native readiness assessment (v1→v3) | Static + thin Express/Neon; scored diagnostic + 90-day plan; feeds the shayzone-ai-os vertical slice. |

**Read:** four execution engines + one meta-OS + one executive layer. The portfolio is
*already* organized the way the 12 repos, taken together, imply an AI org should be.

---

## 2. Capability coverage matrix — the 12 repos vs. what you already have

Verdict key: **HAVE** (already shipped somewhere in the portfolio) · **NET-NEW** (a real
gap worth a small, targeted add) · **SKIP** (deliberate non-adopt as a runtime dependency).

| # | Repo | Core capability it represents | Already in your portfolio? | Verdict |
|---|---|---|---|---|
| 3 | **Ollama** | Run open-weight LLMs locally, free | **Yes** — RAG assistant's *default* `LLM_PROVIDER=ollama` (`src/rag/config.js`, `llm.js`) | **HAVE** → standardize |
| 8 | **DeepSeek-V3** | Strong open-weight reasoning model | Partly — you run Ollama but don't name DeepSeek; trivial to add as a model | **NET-NEW** (minor) |
| 10 | **RAGFlow** | Enterprise RAG w/ deep-document parsing | Partly — you have a *full RAG pipeline*, but text-level ingestion, not layout/table/OCR-aware parsing | **NET-NEW** (RAG ingestion) |
| 6 | **LangChain** | LLM/agent framework, evals, retrievers | Equivalent built by hand (`judge.js`, `retrieve/rerank/rewrite`, agent crew) | **SKIP** as dep; borrow concepts |
| 12 | **CrewAI** | Assemble a team of role-based agents | **Yes** — 5-role crew in `shayzone-ai-os/.claude/agents/` | **HAVE** |
| 11 | **Claude Code** | Agentic coding over the whole repo | **Yes** — shayzone-ai-os is "Claude Code-native"; this build uses it | **HAVE** → use harder |
| 9 | **Gemini CLI** | Google model via CLI, free tier | No — but the judge already *cross-judges with a second model*; Gemini strengthens that | **NET-NEW** (eval + dev) |
| 7 | **Open WebUI** | Self-hosted chat cockpit over local models | No — yet you already run Ollama; a natural local dev/demo surface | **NET-NEW** (dev tool) |
| 2 | **n8n** | Visual workflow automation w/ AI nodes | No — orchestration is code (hooks) + GitHub Actions cron | **SKIP** as runtime; niche use for no-code external integrations |
| 4 | **Langflow** | Drag-and-drop agent builder | No — agents are code-native | **SKIP** as dep; use to *prototype* only |
| 5 | **Dify** | Full-stack LLMOps platform | No — you have equivalent seams (eval, gov, observability) spread across repos | **SKIP** as dep; reference architecture |
| 1 | **OpenClaw** | Local-first personal AI agent | No — not the portfolio's shape | **SKIP** / watch |

**Score:** ~**5 already HAVE**, **4 NET-NEW (all small/targeted)**, **~4 deliberate SKIP.**
There is no capability in this list your portfolio is fundamentally missing.

---

## 3. The genuinely net-new things worth leveraging (ranked)

### ① RAGFlow-grade **deep-document parsing** → Enterprise-RAG-Assistant
**The one real capability gap.** Your RAG pipeline is excellent at *retrieval, grounding and
eval*, but ingestion is text-level. RAGFlow's differentiator is **layout/table/OCR-aware
document parsing** — exactly what you'd need to point the same pipeline at *financial* PDFs
(rate sheets, disclosure tables, annual reports) or enterprise policy docs with structure.
Borrow the parsing approach (or run RAGFlow purely as an *ingestion* stage feeding your
existing pgvector + judge + guardrails). *Highest signal, because it extends the portfolio
into structured-document corpora it can't cleanly handle today.*

### ② **DeepSeek-V3 as a named Ollama model option** → RAG assistant + shayzone-ai-os
Your Ollama provider is model-agnostic; add DeepSeek-V3 (a quantized/distilled variant
locally, or its openai-compatible endpoint) as a **stronger open reasoning model** for the
generator *and* as a **judge-diversity** option. Near-zero effort, keeps $0/private, and
gives a concrete "frontier-class open model" line to your model roster.

### ③ **Gemini CLI as a second free judge model + dev aid** → RAG eval, shayzone eval-gate
`judge.js` already cross-judges with a different model to reduce self-preference bias. A
**third independent model (Gemini free tier)** turns that into a stronger *panel* and
sharpens the shayzone-ai-os gate. Also a cheap second coding assistant alongside Claude
Code. Keep it dev/eval-only; never send sensitive data given free-tier terms.

### ④ **Open WebUI as a local cockpit** over the Ollama you already run
A private, self-hosted chat UI for iterating on prompts (RAG answer prompt, judge rubric,
brief-narrative experiments) and for **demoing** the local-model story in advisory
conversations. Dev tool, never a shipped dependency.

### ⑤ (Consolidation, not a repo) **Promote the best implementations into shayzone-ai-os**
The largest actual leverage isn't a new tool — it's that Ollama config, the LLM-judge, the
eval/golden harness, observability and the cost ledger exist in **both** the RAG assistant
**and** shayzone-ai-os in parallel. Extract the canonical version into the OS as a **shared
skill/contract** the other repos consume. This is literally what "the product is the system"
promises; finishing it is worth more than any item above.

---

## 4. Benefits & concerns (net-new items only)

| Item | Benefit here | Concerns to manage |
|---|---|---|
| **RAGFlow deep parsing** | Unlocks structured-doc corpora (financial PDFs, tables) the current ingester mangles; keeps your superior grounding/eval downstream | Heavy to self-host (DB + parser services + Docker); scope it to an *ingestion stage*, don't swap out your pipeline; license/ops review |
| **DeepSeek-V3 model** | Stronger open reasoning at $0/local; judge diversity | Large full weights → use quantized/distilled; confirm license for any redistribution; still gated by your NLI/judge checks |
| **Gemini CLI (2nd/3rd judge)** | Cheaper, more robust eval via a model *panel*; extra dev assistant | Free-tier quota + data-handling terms — dev/eval only, no sensitive data; don't let it become a runtime dependency |
| **Open WebUI cockpit** | Private prompt-iteration + a tangible local-model demo | One more self-hosted surface to maintain; dev-only, off the shipped path |
| **Consolidation into shayzone-ai-os** | One canonical judge/eval/observability standard; less drift; cleaner portfolio story | Refactor risk across repos; do it behind the existing contracts so each engine swaps source, not screens (as the Studio already proved with its adapter contract) |

**Cross-cutting principles the portfolio already lives by — keep them:** $0 / free-tier
first; local & private by default (Ollama, local embeddings); *everything cited*;
grounding/faithfulness gated (NLI + judge) before anything ships; own/synthetic/public data
only (the client-data bright line); governance with human approval on real runs.

---

## 5. Deliberate non-adopts (the leadership signal)

Documenting what you **won't** adopt, and why, is as valuable as the adds — it shows the
judgment a portfolio owner is hired for.

- **LangChain / LangGraph** — you've hand-built the equivalent seams (retriever, rerank,
  judge, agent loop) with less abstraction overhead. **Borrow concepts** (LangGraph's
  explicit state-machine framing for the shayzone orchestrator; LangChain's eval taxonomy),
  **not the dependency.** Pulling a heavy framework into lean ESM/Claude-Code-native repos is
  a regression.
- **CrewAI** — you already have a role-based crew (orchestrator/researcher/strategist/
  critic/executive-synthesizer) on Claude Code subagents. CrewAI would *replace* a working,
  lighter design with a Python runtime and lock-in. Skip.
- **Dify / Langflow** — full LLMOps platforms and visual builders. Useful as **reference
  architectures** and for **throwaway prototyping**, but self-hosting them contradicts the
  proven $0/static/code-native model. Skip as runtime.
- **n8n** — the one with a narrow *legitimate* future use: **no-code external integrations**
  (wire the Studio to Slack/CRM/email without code). Even then, prefer your existing Worker +
  GitHub Actions unless a non-dev genuinely needs to own a flow. Skip for now.
- **OpenClaw** — a local-first *personal assistant* shape, not a portfolio-engine shape.
  Watch the local-first/on-device privacy posture (which you already embody); don't adopt.

---

## 6. Portfolio roadmap — what to learn & utilize (phased)

Portfolio-level items are prefixed **P#** to avoid colliding with each repo's own R-series.

### Phase A — Learn (time-boxed spikes, no shipped dependency)
- **P1 — Stand up Open WebUI over your existing Ollama** and iterate the RAG answer prompt +
  judge rubric in it. *Signal:* one prompt improvement validated locally, $0.
- **P2 — Add DeepSeek-V3 to the model roster** (Ollama pull or openai-compatible endpoint);
  run the RAG eval with it as generator, then as a judge-panel member. *Signal:* eval
  numbers for DeepSeek recorded next to the current model.
- **P3 — Spike RAGFlow purely as an ingestion stage** on a structured financial PDF; feed its
  output into your existing pgvector + guardrails + judge. *Signal:* a decision note —
  adopt-as-ingester / borrow-parsing-logic / drop.

### Phase B — Net-new adds (small, targeted, keep $0 + grounding gates)
- **P4 — Gemini CLI as a third judge-panel model** in `judge.js` / the shayzone eval-gate,
  behind a config flag. *Signal:* judge agreement/variance reported across a 2–3 model panel;
  no sensitive data leaves local.
- **P5 — DeepSeek-V3 shipped as a selectable model option** in the RAG assistant (and offered
  to the shayzone slice). *Signal:* switchable via `LLM_*` env, eval-gated, still $0/local.
- **P6 — RAGFlow-informed ingestion** (adopt or reimplement layout/table parsing) so the RAG
  assistant can index structured docs. *Signal:* a table-heavy PDF answered with correct
  cited cells; grounding rate holds at/above current.

### Phase C — Consolidation (the biggest leverage)
- **P7 — Extract the canonical LLM-judge + eval/golden harness into shayzone-ai-os** as a
  shared skill/contract; have the RAG assistant (and any future engine) consume it. *Signal:*
  one judge/rubric of record; per-repo copies deleted or importing it.
- **P8 — Unify observability + cost ledger** across the RAG assistant and shayzone-ai-os into
  one economics contract the Studio reads live. *Signal:* the Studio's cost/ROI tiles source
  from a single portfolio ledger.

### Phase D — Positioning (turn the analysis into portfolio equity)
- **P9 — Publish this matrix as a Studio module / one-pager**: "How my portfolio maps to the
  top-12 OSS AI tools — adopted, out-built, and deliberately rejected." *Signal:* a reviewer
  sees, per capability, where you already stand and the judgment behind each call. This is the
  Director/VP-of-AI artifact the whole exercise is really for.

### Non-goals (explicit)
- Adopting **LangChain/CrewAI/Dify/n8n/Langflow** as **runtime dependencies** — documented
  rejects (§5).
- Any **paid LLM API** or **always-on paid infra** on a hot path — the portfolio's $0/free-tier
  identity is a feature.
- **Model-authored numbers** in the FI agent — numbers stay deterministic-adapter output.
- Touching the **client-data bright line** — own/synthetic/public data only.

---

## 7. Principles to preserve while adopting any of the above

1. **$0 / free-tier / local-first by default** — every add above holds this.
2. **Grounded or it doesn't ship** — NLI + judge + gate stay release gates, not options.
3. **Everything cited** — no claim without a resolvable source.
4. **Code-native, "the product is the system"** — prefer patterns/contracts over frameworks.
5. **Governance + human approval on real runs; client-data bright line intact.**

---

*Companion to each repo's own README/roadmap. This document adds no runtime dependencies by
itself; it is a review + plan. Its recommended long-term home is the
[AI Product & Leadership Studio](https://github.com/shayeeboy/AI-Product-Leadership-Studio)
(as the §P9 positioning module) or [shayzone-ai-os](https://github.com/shayeeboy/shayzone-ai-os)
(as the §P7/P8 shared standards).*
