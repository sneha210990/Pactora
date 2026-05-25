# Pactora — API Cost per Full Contract Review

**Prepared:** 25 May 2026  
**Scope:** Trace of the live codebase (`lib/agents/`, `app/api/contracts/`)  
**Pricing source:** `lib/agents/api-cost.ts` (Anthropic pricing, May 2025)

---

## How a Full Contract Review Works

A review consists of five sequential stages, three of which involve the Claude API.

```
Upload → Extract → [Pre-classify] → [8 Clause Agents] → Cross-clause check → [Redline]
                      (API)            (API)              (no LLM)             (API, optional)
```

**Stage 0 — Text extraction** (`/api/contracts/extract`)  
PDF via `pdf-parse`, DOCX via `mammoth`. No Claude API call. Zero cost.

**Stage 1 — Pre-classification** (`/api/contracts/analyze-agents` → `classifyPresentClauses` + `classifyContractType`)  
Two Haiku calls run in parallel against the first 40,000 chars of the contract:
- **Clause presence check**: identifies which of the 8 clause types are substantively present, skipping agents for absent types.
- **Contract type detection**: classifies as SaaS / NDA / Employment / etc. to calibrate risk thresholds.

**Stage 2 — 8 Specialist clause agents** (parallel, same route)  
Each agent receives the full contract text in a cached system block plus a clause-specific instruction prompt. Models are:

| Clause type | Model | Reason |
|-------------|-------|---------|
| IP Ownership | Sonnet + extended thinking (2k budget) | Multi-step IP chain reasoning |
| Indemnities | Sonnet + extended thinking (2k budget) | Cap interaction, carve-out tracing |
| Liability Cap | Haiku | Pattern recognition — find cap amount, check mutuality |
| Data Protection | Haiku | Checklist-style GDPR gap analysis |
| Termination Rights | Haiku | Checklist — notice periods, cure rights |
| Auto-Renewal | Haiku | Opt-out window, lock-in consequence |
| Fee Increases | Haiku | Unilateral rights, exit triggers |
| Governing Law | Haiku | Jurisdiction, arbitration, injunctive carve-out |

**Caching architecture (key cost lever):** The contract text sits in system block 1 with `cache_control: ephemeral`. Because all 8 agents send identical text, Anthropic caches it on the first call per model family. Subsequent agents pay only 10% of the normal input rate for that block.

- Sonnet cache group (2 agents): 1× cache write + 1× cache read
- Haiku cache group (6 agents): 1× cache write + 5× cache reads

**Stage 3 — Cross-clause engine** (`lib/agents/cross-clause-engine.ts`)  
Deterministic pair checks (e.g. indemnity "notwithstanding" language vs. liability cap). No LLM. Zero API cost.

**Stage 4 — Redline generation** (`/api/contracts/redline`, optional, per clause)  
User-triggered from the review summary — one API call per clause the user asks to redline. The system prompt is cached across multiple redline calls in the same session.

- IP Ownership + Indemnities: Sonnet + extended thinking (4k budget, max 8k tokens)
- Liability Cap, Data Protection, Termination: Haiku (max 600 tokens)

---

## Token Assumptions

### Contract size
- **7,500 words** — representative SaaS agreement (MSA + DPA + order form)
- ≈ **10,000 tokens** for the full document
- ≈ **8,900 tokens** for the first 40k characters (sent to pre-classifiers)
- Single chunk (< 100,000 chars): no chunking overhead

### Prompt token estimates (measured from source code)

| Component | Tokens |
|-----------|--------|
| Contract text in system block (cached) | 10,000 |
| CLAUSE_AGENT_TOOLS (both tool schemas) | 545 |
| IP Ownership clause prompt | 930 |
| Indemnities clause prompt | 425 |
| Liability Cap clause prompt | 410 |
| Data Protection clause prompt | 195 |
| Termination Rights clause prompt | 190 |
| Auto-Renewal clause prompt | 205 |
| Fee Increases clause prompt | 215 |
| Governing Law clause prompt | 215 |
| Redline SYSTEM_PROMPT | 280 |
| User turn per clause agent | 30 |
| User turn per redline call (type + clause text) | 300 |

### Output token estimates

| Call type | Estimated output |
|-----------|-----------------|
| Haiku clause agent — flags a clause | 400 tokens (tool call + verbatim clause + 3-position negotiation ladder) |
| Haiku clause agent — no issue found | 70 tokens |
| Haiku clause agent — average (60% flagging rate) | ~270 tokens |
| Sonnet + thinking — clause agent | 1,600 tokens (1,000 thinking + 600 tool call) |
| Haiku redline call | 350 tokens (clause alternative + "Why this works") |
| Sonnet + thinking redline | 2,300 tokens (2,000 thinking + 300 alternative text) |
| Pre-classifier (clause presence) | 150 tokens |
| Pre-classifier (contract type) | 20 tokens |

*Output tokens for Sonnet+thinking include the thinking block, which is billed at the full output rate.*

---

## Pricing Used

Source: `lib/agents/api-cost.ts`. Matches Anthropic published pricing for Claude 4.5/4.6 family.

| Model | Input (£/M) | Output (£/M) | Cache write (£/M) | Cache read (£/M) |
|-------|-------------|--------------|-------------------|------------------|
| claude-haiku-4-5-20251001 | £0.80 | £4.00 | £1.00 | £0.08 |
| claude-sonnet-4-6 | £3.00 | £15.00 | £3.75 | £0.30 |

---

## Cost Breakdown — Per Contract Review

### Stage 1: Pre-classification (two Haiku calls, run in parallel)

**Clause presence classifier (Haiku)**

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Input (system + tool schema + contract first-40k) | 9,068 | £0.80/M | £0.00725 |
| Output | 150 | £4.00/M | £0.00060 |
| **Subtotal** | | | **£0.00785** |

**Contract type classifier (Haiku)**

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Input | 9,060 | £0.80/M | £0.00725 |
| Output | 20 | £4.00/M | £0.00008 |
| **Subtotal** | | | **£0.00733** |

**Stage 1 total: £0.016**

---

### Stage 2: 8 Clause Agents

#### IP Ownership (Sonnet + thinking — first Sonnet = cache write)

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Non-cached input (prompt + tools + user turn) | 1,505 | £3.00/M | £0.00452 |
| Cache write (contract text) | 10,000 | £3.75/M | £0.03750 |
| Output (thinking + tool call) | 1,600 | £15.00/M | £0.02400 |
| **Subtotal** | | | **£0.066** |

#### Indemnities (Sonnet + thinking — cache read)

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Non-cached input | 1,000 | £3.00/M | £0.00300 |
| Cache read (contract text) | 10,000 | £0.30/M | £0.00300 |
| Output | 1,600 | £15.00/M | £0.02400 |
| **Subtotal** | | | **£0.030** |

#### Liability Cap (Haiku — first Haiku = cache write)

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Non-cached input | 985 | £0.80/M | £0.00079 |
| Cache write (contract text) | 10,000 | £1.00/M | £0.01000 |
| Output | 270 | £4.00/M | £0.00108 |
| **Subtotal** | | | **£0.012** |

#### Data Protection (Haiku — cache read)

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Non-cached input | 770 | £0.80/M | £0.00062 |
| Cache read (contract text) | 10,000 | £0.08/M | £0.00080 |
| Output | 270 | £4.00/M | £0.00108 |
| **Subtotal** | | | **£0.0025** |

#### Termination Rights (Haiku — cache read)

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Non-cached input | 765 | £0.80/M | £0.00061 |
| Cache read | 10,000 | £0.08/M | £0.00080 |
| Output | 270 | £4.00/M | £0.00108 |
| **Subtotal** | | | **£0.0025** |

#### Auto-Renewal, Fee Increases, Governing Law (Haiku — cache read, ×3)

Each: non-cached input ~790 tokens, cache read 10,000, output 270 tokens  
Per agent: (790 × £0.80/M) + (10,000 × £0.08/M) + (270 × £4.00/M) = £0.00063 + £0.00080 + £0.00108 = **£0.0025**  
Three agents: **£0.0075**

**Stage 2 total: £0.120**

---

### Stage 3: Cross-clause engine

Pure pattern matching. No API calls.  
**Stage 3 total: £0.000**

---

### Stage 4: Redline Generation (all 5 eligible clause types)

*Triggered only when the user clicks "Suggest redline". The redline SYSTEM_PROMPT (280 tokens) is cached after the first call.*

#### IP Ownership (Sonnet + thinking — first redline = cache write)

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Non-cached input (user message with clause text) | 300 | £3.00/M | £0.00090 |
| Cache write (redline system prompt) | 280 | £3.75/M | £0.00105 |
| Output (thinking + alternative clause text) | 2,300 | £15.00/M | £0.03450 |
| **Subtotal** | | | **£0.0365** |

#### Indemnities (Sonnet + thinking — cache read)

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Non-cached input | 300 | £3.00/M | £0.00090 |
| Cache read (system prompt) | 280 | £0.30/M | £0.00008 |
| Output | 2,300 | £15.00/M | £0.03450 |
| **Subtotal** | | | **£0.0355** |

#### Liability Cap (Haiku — cache write for Haiku redline calls)

| Token type | Tokens | Rate | Cost |
|------------|--------|------|------|
| Non-cached input | 300 | £0.80/M | £0.00024 |
| Cache write (system prompt) | 280 | £1.00/M | £0.00028 |
| Output | 350 | £4.00/M | £0.00140 |
| **Subtotal** | | | **£0.0019** |

#### Data Protection + Termination Rights (Haiku — cache read, ×2)

Each: £0.00024 + £0.00002 + £0.00140 = **£0.0017**  
Two agents: **£0.0034**

**Stage 4 total (all 5 redlines): £0.077**

---

## Total Cost Per Contract

| Scenario | Stage 1 | Stage 2 | Stage 3 | Stage 4 | **Total** |
|----------|---------|---------|---------|---------|-----------|
| Analysis only (no redlines) | £0.016 | £0.120 | £0.000 | — | **£0.136** |
| Analysis + 2 Sonnet redlines (IP + Indemnities) | £0.016 | £0.120 | £0.000 | £0.072 | **£0.208** |
| Analysis + all 5 redlines | £0.016 | £0.120 | £0.000 | £0.077 | **£0.213** |

> **Typical per-contract API cost: £0.14–£0.21**

The range is narrow because the Haiku redlines are negligible (< £0.002 each). The dominant cost driver is the two Sonnet+thinking clause agents, which together account for 80% of the analysis cost.

---

## Where the Money Goes

### Analysis-only cost breakdown (£0.136)

```
IP Ownership agent (Sonnet, cache write)  ████████████████████████░░░  £0.066  49%
Indemnities agent (Sonnet, cache read)    ██████████████░░░░░░░░░░░░░  £0.030  22%
Liability Cap agent (Haiku, cache write)  █████░░░░░░░░░░░░░░░░░░░░░░  £0.012   9%
Pre-classification (2× Haiku)            ██████░░░░░░░░░░░░░░░░░░░░░  £0.016  12%
5× Haiku cache-read agents               ████░░░░░░░░░░░░░░░░░░░░░░░  £0.012   9%
```

The IP Ownership cache write is the single most expensive token event: the Sonnet rate (£3.75/M cache write + £15.00/M output with thinking) means that one call costs £0.066, nearly half the entire analysis budget.

### Key cost levers

1. **Prompt caching is working hard.** Without it, the contract text (~10,000 tokens) would be billed at full input rate for all 8 agents. Full input cost without caching: 8 × 10,000 × £3.00/M (Sonnet) or £0.80/M (Haiku) = ~£0.22 extra per review just for the contract text. Caching turns this into one cache-write + reads.

2. **Haiku for 6 of 8 agents saves significantly.** If all 8 ran on Sonnet without thinking, the clause analysis stage alone would cost ~£0.40.

3. **The pre-classifier (AI-06) skips absent clause types.** For shorter contracts (NDAs, simple MSAs), 2–4 agents may be skipped, saving £0.003–£0.015 per skipped agent.

4. **Extended thinking cost is dominated by output, not thinking.** The Sonnet output rate is £15.00/M. Even with 1,000 thinking tokens, the response itself (~600 tokens) accounts for 40% of the output cost. Reducing the thinking budget from 2k to 1k had minimal real cost impact.

---

## Margin Analysis at Proposed Per-Contract Price

Assumes typical use: full analysis + user requests 2 Sonnet redlines (IP + Indemnities) = **£0.21 cost**.

| Per-contract price | API cost | API cost margin | £ profit (API only) |
|-------------------|----------|-----------------|---------------------|
| £15 | £0.21 | **98.6%** | £14.79 |
| £20 | £0.21 | **98.9%** | £19.79 |
| £25 | £0.21 | **99.2%** | £24.79 |

Even at the pessimistic end (all 5 redlines, £0.21): API gross margin is > 98% at any of these price points.

**The API cost is not a pricing constraint.** Margin pressure will come from infrastructure (Vercel serverless, Supabase), support, CAC, and the time cost of the 60–120 second analysis window (Vercel Pro plan needed for `maxDuration: 120`).

---

## Assumptions Summary

| Assumption | Value |
|------------|-------|
| Average contract size | 7,500 words (10,000 tokens) |
| Contract fits single chunk | Yes (< 100,000 chars) |
| All 8 clause types present | Yes (typical SaaS MSA) |
| Haiku output — avg flagging rate | 60%, avg output 270 tokens |
| Sonnet+thinking — clause agent output | 1,600 tokens (1,000 thinking + 600 tool call) |
| Sonnet+thinking — redline output | 2,300 tokens (2,000 thinking + 300 text) |
| Prompt caching | Yes — contract text cached across 8 agents; redline system prompt cached across redline calls |
| Redlines modelled | 2 Sonnet (IP + Indemnities) — typical; all 5 — worst case |
| Pricing currency | £ (matches Anthropic GBP pricing; numerically equal to published USD rates) |

---

## What This Does Not Include

- **Vercel execution time**: each analysis run holds a 120s serverless function slot. At scale this drives infrastructure cost.
- **Supabase**: auth and beta-store usage records add marginal database cost.
- **PDF/DOCX processing**: CPU-only, but `pdf-parse` on large files can be slow.
- **Failed/retried requests**: error paths (agent timeout, API error) may re-bill or partially bill tokens.
- **Multi-chunk contracts**: documents > 100k chars (~75,000 words) trigger the chunking path, multiplying clause agent calls by the number of chunks.
