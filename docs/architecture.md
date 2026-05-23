# Pactora Architecture Map

## Overview

Pactora is a Next.js 16 / React 19 application that analyses SaaS contracts using Claude (Anthropic SDK). It runs two independent analysis pipelines — an AI clause-analysis pipeline (probabilistic) and a deterministic integrity engine — plus negotiation and redline generation features.

---

## System Components

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router, React 19)                          │
│                                                                  │
│  /deals/new          — upload + extract                          │
│  /review/summary     — dashboard (flags, risks, redlines, email) │
│  /review/lol         — Liability Cap deep-dive                   │
│  /review/indemnities — Indemnities deep-dive                     │
│  /review/ip          — IP Ownership deep-dive                    │
│  /review/data        — Data Protection deep-dive                 │
│  /review/termination — Termination Rights deep-dive              │
│                                                                  │
│  State: document-analysis-store (React context + useReducer)     │
│  Persistence: localStorage (key: pactora.documentAnalysis.v2)    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTP / SSE
┌────────────────────────────▼─────────────────────────────────────┐
│  Next.js API Routes (App Router)                                 │
│                                                                  │
│  POST /api/contracts/extract          File parsing + metadata    │
│  POST /api/contracts/analyze-agents   Parallel clause agents SSE │
│  POST /api/contracts/analyze          Legacy monolithic analysis │
│  POST /api/contracts/redline          Clause alternative lang.   │
│  POST /api/contracts/negotiate        Negotiation email draft    │
│  POST /api/contracts/integrity        Deterministic doc checks   │
│  POST /api/redline/export             Download redlined DOCX     │
│                                                                  │
│  Auth: /api/auth/{google,login,logout,session}, /api/me          │
└───────┬────────────────────┬─────────────────────────────────────┘
        │                    │
┌───────▼──────┐    ┌────────▼────────────────────────────────────┐
│  Supabase    │    │  Anthropic Claude API                        │
│  (auth only) │    │                                              │
│              │    │  Extraction:  claude-haiku-4-5-20251001      │
│  Cookie      │    │  Simple agents: claude-haiku-4-5-20251001    │
│  sessions    │    │  Hard agents:   claude-sonnet-4-6 + thinking │
│  JWT refresh │    │  Redline (IP/Ind): claude-sonnet-4-6+thinking│
└──────────────┘    │  Redline (others): claude-haiku-4-5-20251001 │
                    │  Negotiate: claude-sonnet-4-6                │
                    └─────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  File-based Beta Store  (/tmp/… on Vercel, ./data/… locally)    │
│  Stores: users, sessions, feedback, events, apiUsage            │
│                                                                  │
│  Prisma schema (prisma/schema.prisma) — prepared for PostgreSQL  │
│  but not yet wired into the live runtime.                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Step 1 — Contract Upload & Extraction

**Trigger**: User drops a file on `/deals/new`. The store dispatches `uploadStarted(file)`.

**Endpoint**: `POST /api/contracts/extract`  
**File**: `app/api/contracts/extract/route.ts`

```
Browser
  │  multipart/form-data (PDF/DOCX/DOC, ≤20 MB)
  │  OR JSON { text, sourceName }
  ▼
extractContractText()               lib/contract-extraction.ts
  ├── PDF  → pdf-parse v2.0.550     (server external package — see next.config.ts)
  ├── DOCX → mammoth
  └── DOC  → binary best-effort

detectContractValues()              (inline, regex)
  ├── ACV, insurance amounts        money regex + keyword matching
  ├── termMonths                    month/year patterns
  └── dataType                      keyword detection

AI extraction (Haiku, tool_use)     lib/ai-extraction.ts
  ├── Tool: extract_contract_values
  ├── Fields: acv, termMonths, insuranceCover, dataType, liabilityCap,
  │           governingLaw, terminationNotice, renewalTerm, currency
  └── Fallback: if AI fails, regex results survive

Merge: AI wins numeric; AI wins dataType/liabilityCap/law; regex fills gaps.

Response:
  { documentId, detectedValues, extractedTerms, documentMeta,
    contractText, sourceFileType?, docxBuffer? }
```

Client receives response → `hydrateExtraction(payload)` updates store.

---

### Step 2 — Clause Analysis (Parallel Agents)

**Trigger**: Client calls `POST /api/contracts/analyze-agents` after extraction.

**Endpoint**: `app/api/contracts/analyze-agents/route.ts`  
**Agent executor**: `lib/agents/run-clause-agent.ts`  
**Prompts**: `lib/agents/clause-prompts.ts`

```
Contract text (≤100k chars)          lib/chunking-strategy.ts
  ├── Single chunk → continue
  └── >100k chars → overlapping 100k chunks (5k overlap, sentence-boundary snap)

Per chunk (or single):
  Promise.allSettled([8 agents in parallel])
    │
    ├── Liability Cap       claude-sonnet-4-6 + extended thinking (4k budget)
    ├── Indemnities         claude-sonnet-4-6 + extended thinking
    ├── IP Ownership        claude-sonnet-4-6 + extended thinking
    ├── Data Protection     claude-haiku-4-5-20251001
    ├── Termination Rights  claude-haiku-4-5-20251001
    ├── Auto-Renewal        claude-haiku-4-5-20251001
    ├── Fee Increases       claude-haiku-4-5-20251001
    └── Governing Law       claude-haiku-4-5-20251001

Each agent call (run-clause-agent.ts):
  messages[0].system[0]  = contract text  + cache_control: ephemeral  ← prompt cache
  messages[0].system[1]  = clause-specific prompt (uncached)
  tool_choice: { type: 'any' }   forces tool use (no free text)
  Tools: flag_clause | no_issue_found

  Response → flagWithVerification()           lib/agents/hallucination-check.ts
    ├── Verify clauseText ⊂ full contract (substring check)
    └── enrichFlagWithPageNumber()             lib/pdf-utils.ts
          ├── Page number from PDF char offsets
          └── Highlight char range

Multi-chunk: mergeChunkResults()
  Deduplicate by: clauseType + first 100 chars of problematicLanguage
  Prefer verified flag; keep first-chunk occurrence on tie.

After all 8 agents → runCrossClauseEngine()   lib/agents/cross-clause-engine.ts
  Three deterministic checks:
  ① Indemnity↔Cap  — "notwithstanding" / carve-out language
  ② IP↔Indemnity   — ownership breadth vs. indemnity scope
  ③ Data↔Cap       — breach carve-out from limitation clause

SSE stream events:
  agent_start   — { clauseType }
  agent_result  — { clauseType, flag | null }
  agent_error   — { clauseType, error }
  analysis_complete — { flags[], crossClauseRisks[] }
```

Client receives SSE → `hydrateAnalysis(analysis)` converts flags → clauses/risks/recommendations.  
Cost is recorded asynchronously to beta-store (`recordApiUsage`).

---

### Step 3 — Redline Generation (on demand)

**Endpoint**: `POST /api/contracts/redline`  
**File**: `app/api/contracts/redline/route.ts`

```
{ clauseText, clauseType, acv?, liabilityCap? }
  ▼
THINKING_CLAUSE_TYPES = { 'IP Ownership', 'Indemnities' }
  ├── yes → claude-sonnet-4-6 + extended thinking (4k budget)
  └── no  → claude-haiku-4-5-20251001

Response: plain text separated by "\nWhy this works:"
  → parsed by RedlineSuggestion component
  → rendered via ClauseDiff (word-level LCS diff)

Accepted redline → store.acceptRedline(clauseType, { clauseText, proposedText, explanation })
```

---

### Step 4 — Negotiation Email (on demand)

**Endpoint**: `POST /api/contracts/negotiate`

```
{ flags: ClauseFlag[], commercialContext }
  ▼
claude-sonnet-4-6  max_tokens=1500  temp=0
System prompt: 9 rules, ranked High→Medium→Low asks
Response: { email: string }  — ready-to-send negotiation letter
```

---

### Step 5 — Results Storage & Display

**Client-side state** (`lib/document-analysis-store.tsx`):

```
localStorage: pactora.documentAnalysis.v2
  Persists full DocumentAnalysisState across page navigations and reloads.
  Cleared when activeDocumentId changes (new upload).

State shape (key fields):
  documentId            — UUID assigned at upload
  activeDocument        — { id, fileName, uploadedAt }
  uploadStatus          — idle | uploading | processing | complete | error
  commercialContext     — { acv, termMonths, insuranceCover, dataType, currency, ... }
  extractedTerms        — { effectiveDate, governingLaw, terminationNotice, renewalTerm }
  extractedParties      — { client, vendor, counterparty }
  clauses[]             — converted from ClauseFlag[]
  risks[]               — converted from ClauseFlag[]
  recommendations[]     — generated from flag negotiationPoints
  crossClauseRisks[]    — from cross-clause engine
  acceptedRedlines      — Record<clauseType, { clauseText, proposedText, explanation }>
  rawText               — full contract text (for redline export)
  sourceFileType        — 'docx' | 'pdf' | null
```

**Review pages** all consume the same store via hooks — no per-page re-inference:

```
useDocumentAnalysis()          → full state
useClauseByType(clauseType)    → first matching Clause
useRiskByType(clauseType)      → first matching Risk
useDocumentCommercialContext() → commercialContext object
```

No page fetches data independently. There is **one canonical analysis object** in localStorage and React context.

---

## Managed Agents Status

**Current state: infrastructure prepared, not yet activated.**

| Item | Status |
|------|--------|
| `ANTHROPIC_AGENT_ID` env var | In `.env.example`, unused |
| `ANTHROPIC_ENVIRONMENT_ID` env var | In `.env.example`, unused |
| `lib/agents/client.ts` | `getManagedAgentConfig()` returns `null` when vars absent |
| Agents route comments | Migration path annotated (sessions.create / sessions.send / sessions.events) |
| Current execution | Direct `client.messages.create()` calls, `Promise.allSettled` parallelism |

To activate, replace `runClauseAgent()` calls in `analyze-agents/route.ts` with:
```
client.beta.sessions.create()  →  client.beta.sessions.send()  →  client.beta.sessions.events()
```

---

## Key Files Reference

| Concern | File |
|---------|------|
| Contract parsing | `lib/contract-extraction.ts` |
| AI value extraction | `lib/ai-extraction.ts` |
| Chunking | `lib/chunking-strategy.ts` |
| Agent orchestration | `app/api/contracts/analyze-agents/route.ts` |
| Agent executor | `lib/agents/run-clause-agent.ts` |
| Clause types registry | `lib/agents/types.ts` |
| Clause prompts | `lib/agents/clause-prompts.ts` |
| Hallucination check | `lib/agents/hallucination-check.ts` |
| Cross-clause engine | `lib/agents/cross-clause-engine.ts` |
| Cost accounting | `lib/agents/api-cost.ts` |
| PDF page metadata | `lib/pdf-utils.ts` |
| Client state store | `lib/document-analysis-store.tsx` |
| Server persistence | `lib/beta-store.ts` |
| Auth (Supabase) | `lib/auth.ts`, `lib/supabase-auth.ts` |
| Middleware | `middleware.ts` (currently pass-through) |
| Redline generation | `app/api/contracts/redline/route.ts` |
| Negotiate email | `app/api/contracts/negotiate/route.ts` |
| Integrity engine | `lib/integrity-engine/` |
| Summary dashboard | `app/review/summary/page.tsx` |
| Clause diff UI | `app/review/components/clause-diff.tsx` |
| Redline UI | `app/review/components/redline-suggestion.tsx` |
| DB schema (future) | `prisma/schema.prisma` |

---

## Extensibility Notes

### Adding a new clause type

1. Add entry to `PACTORA_CLAUSE_AGENTS` in `lib/agents/types.ts`
2. Write clause-specific system prompt in `lib/agents/clause-prompts.ts`
3. Decide model: add to `EXTENDED_THINKING_CLAUSE_TYPES` (Sonnet+thinking) or leave as Haiku
4. Add to `PLAYBOOK_CLAUSE_TYPES` in `app/review/summary/page.tsx` to enable the "Suggest redline" button
5. Optionally add a `/review/<new-type>/page.tsx` deep-dive page

### Migrating from file store to PostgreSQL

The `prisma/schema.prisma` models are ready. Replace `lib/beta-store.ts` calls with Prisma client calls; no API surface changes required.

### Wiring the integrity engine to the UI

`POST /api/contracts/integrity` is implemented. The engine (`lib/integrity-engine/engine.ts`) returns a structured report. A UI surface just needs to call the endpoint and render the report shape.

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | All Claude API calls |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (auth) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (auth) | Supabase public key |
| `NEXT_PUBLIC_APP_URL` | Yes | Frontend origin |
| `APP_URL` | Yes | Backend origin (OAuth redirects) |
| `PACTORA_OPERATOR_KEY` | Yes (operator) | Operator dashboard secret |
| `ANTHROPIC_AGENT_ID` | No (future) | Managed Agents ID |
| `ANTHROPIC_ENVIRONMENT_ID` | No (future) | Managed Agents environment |
| `DATABASE_URL` | No (future) | PostgreSQL connection string |
