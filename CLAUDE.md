# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: `pnpm` (global rule). `package.json` scripts still call `npm` for Playwright's `webServer` — invoke them with `pnpm` directly when running manually.

- `pnpm dev` — Next.js dev server (port 3000)
- `pnpm build` / `pnpm start` — prod build + serve
- `pnpm lint` — ESLint (`eslint-config-next` core-web-vitals + TS)
- `pnpm test` — Vitest unit tests (Node env, `tests/unit/**/*.test.ts`)
- `pnpm test:watch` — Vitest watch
- `pnpm test -- tests/unit/contract-extraction.test.ts` — single Vitest file
- `pnpm qa` — Playwright workflow suite. Internally runs `npm run build && npm run start` as `webServer`; reuses an already-running dev/prod server when not in CI
- `pnpm qa:report` — open last Playwright HTML report

Env: copy `.env.example` → `.env.local`. Required for full functionality:
- `ANTHROPIC_API_KEY` — clause/extraction agents
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — auth
- `PACTORA_OPERATOR_KEY` — operator endpoints
- `ANTHROPIC_AGENT_ID` / `ANTHROPIC_ENVIRONMENT_ID` — reserved for Managed Agents migration (not active yet)

TS path alias: `@/*` → repo root.

## Architecture

Next.js 16 App Router. React 19. Tailwind v4. No DB wired yet — `prisma/schema.prisma` is a *suggested* model for future PostgreSQL persistence; nothing in the live runtime uses Prisma.

### Two distinct analysis pipelines

Both ingest contract text via `/api/contracts/extract` (PDF via `pdf-parse`, DOCX via `mammoth`, see [lib/contract-extraction.ts](lib/contract-extraction.ts) and [next.config.ts](next.config.ts) for the pdf-parse externalization quirk).

**1. AI clause analysis (probabilistic, Anthropic-backed).**
- Entry: `POST /api/contracts/analyze-agents` (SSE). Legacy non-agent route `/api/contracts/analyze` is still live; agents path is additive.
- 8 specialist clause agents in [lib/agents/run-clause-agent.ts](lib/agents/run-clause-agent.ts) ([lib/agents/types.ts](lib/agents/types.ts) lists them). Three "hard" types (Liability Cap, Indemnities, IP Ownership) use Sonnet with extended thinking (4k budget); the other five use Haiku.
- Caching: contract text in first `system` block with `cache_control: ephemeral` so the 2nd–8th parallel agents pay 10% input pricing. Clause-specific prompt is in a second uncached block.
- Tool use is forced (`tool_choice: 'any'`) against `CLAUSE_AGENT_TOOLS` so models return structured `flag_clause` or `no_issue_found` calls — not free text.
- Anti-hallucination: every `clauseText` is verified against full source via `flagWithVerification` ([lib/agents/hallucination-check.ts](lib/agents/hallucination-check.ts)); flags get page-number enrichment from `extractPDFMetadata` ([lib/pdf-utils.ts](lib/pdf-utils.ts)).
- Long contracts: [lib/chunking-strategy.ts](lib/chunking-strategy.ts) splits into overlapping chunks; multi-chunk path runs agents per chunk then merges/dedups before emitting.
- After all 8 finish, [lib/agents/cross-clause-engine.ts](lib/agents/cross-clause-engine.ts) runs deterministic pair checks (e.g. indemnity carve-out vs cap) and emits a `CrossClauseRisk[]` in `analysis_complete`.

**2. Integrity engine (deterministic, no LLM).**
- Entry: `POST /api/contracts/integrity` (JSON or multipart). See [docs/integrity-engine.md](docs/integrity-engine.md).
- Pure functions in [lib/integrity-engine/](lib/integrity-engine/): `parser.ts` → sections/definitions/references, then composable validators in [lib/integrity-engine/validators/](lib/integrity-engine/validators/) (undefined terms, duplicate defs, dead defs, broken cross-refs, inconsistent capitalization). `engine.ts` orchestrates.
- Multi-document: one structural target set across all uploaded docs (MSA can validate refs to a separately-uploaded Schedule).
- This is intentionally not chatbot-driven. Future AI is meant to *augment*, not replace, validators.

### Client state — single source of truth

[lib/document-analysis-store.tsx](lib/document-analysis-store.tsx) (React context + reducer) is the canonical store for an uploaded document. Flow:

1. `/deals/new` dispatches `uploadStarted(file)` → POSTs to `/api/contracts/extract`.
2. Extraction response hydrates store via `hydrateExtraction(payload)`.
3. Client calls `/api/contracts/analyze-agents`; SSE events hydrate clauses/risks/recommendations via `hydrateAnalysis(analysis)`.
4. Review pages (`app/review/{lol,indemnities,ip,data,termination,summary}/page.tsx`) read via `useDocumentAnalysis`, `useDocumentCommercialContext`, `useClauseByType` — never via query params or component-local storage.

Empty-state policy from [docs/document-analysis-state.md](docs/document-analysis-state.md): when the parser misses data, show explicit empty states ("Clause not detected", "Not identified") — do NOT invent legal or commercial content.

### Auth

Supabase-backed cookie sessions ([lib/supabase-auth.ts](lib/supabase-auth.ts), [lib/auth.ts](lib/auth.ts)). Access-token refresh is built into `getCurrentSessionUser`. [middleware.ts](middleware.ts) currently passes everything through — the workflow is intentionally public.

User/usage records currently live in a file-based store ([lib/beta-store.ts](lib/beta-store.ts)). `auth.ts` falls back to an in-memory user shape on read-only filesystems (serverless). Treat this as transitional — Prisma schema in `prisma/schema.prisma` is the target.

### Cost tracking

[lib/agents/api-cost.ts](lib/agents/api-cost.ts) computes USD from token usage per model. `recordApiUsage` in beta-store persists per-request cost. Keep this updated when adding new models or changing prompt structure.

### Negotiation playbook (AI-08, shipped)

- `PLAYBOOK_CLAUSE_TYPES` in [app/review/summary/page.tsx](app/review/summary/page.tsx) controls which flag cards show the "Suggest redline" button. Currently: `Liability Cap`, `Indemnities`, `IP Ownership`, `Data Protection`, `Termination`.
- [app/review/components/clause-diff.tsx](app/review/components/clause-diff.tsx) — word-level LCS diff, two-column side-by-side layout. Import and use whenever rendering original vs proposed clause text.
- [app/review/components/redline-suggestion.tsx](app/review/components/redline-suggestion.tsx) — calls `/api/contracts/redline`, parses `\nWhy this works:` separator, renders `ClauseDiff`.
- [app/api/contracts/redline/route.ts](app/api/contracts/redline/route.ts) — `THINKING_CLAUSE_TYPES = Set(['IP Ownership', 'Indemnities'])` use Sonnet + extended thinking (4k budget); others use Haiku. Rules 5–9 in `SYSTEM_PROMPT` are clause-type-specific.

### Downloadable redline DOCX (AI-09, next)

Tracked in [issue #138](https://github.com/sneha210990/Pactora/issues/138). When implementing:
- Add `accepted: boolean` per-clause state to `document-analysis-store` reducer
- New `POST /api/contracts/redline/export` route — accepts accepted redlines, returns `.docx` blob
- Use [`docx`](https://docx.js.org) npm library `DeletedText` / `InsertedText` revision nodes for tracked changes
- Fallback: two-column PDF via `@react-pdf/renderer` if DOCX tracked-changes proves too complex for v1

## Conventions specific to this repo

- When wiring a new review surface, import from `@/lib/document-analysis-store` — never re-derive extracted contract data from query strings or `localStorage`.
- New extraction payloads must be normalized inside `hydrateExtraction`/`hydrateAnalysis` *before* components consume them.
- New clause types: add to `PACTORA_CLAUSE_AGENTS` in [lib/agents/types.ts](lib/agents/types.ts), add system prompt in [lib/agents/clause-prompts.ts](lib/agents/clause-prompts.ts), decide Haiku vs Sonnet+thinking in `EXTENDED_THINKING_CLAUSE_TYPES`.
- Override `clauseType` from the known agent identity, not the model's returned string (see `run-clause-agent.ts` — guards against category hallucination).
- `pdf-parse` is in `serverExternalPackages` because its `createRequire` path defeats Next's static tracer. If touching extraction, preserve `outputFileTracingIncludes` in `next.config.ts`.
- Tests excluded from `tsconfig.json`; Vitest has its own `@` alias in `vitest.config.ts`.

---

## Pactora rules engine (schema v2)

A jurisdiction-aware legal rules corpus lives alongside the Next.js app in `rules/`.
It is the source of truth for which legal rules the AI analysis pipeline flags against.

### Layout

```
rules/                          # Six YAML rule files (schema v2)
pactora_maint.py                # validate-v2, staleness, scaffold-jurisdiction
pactora_harness.py              # Analysis pipeline — v2 port is Task 1 (not yet written)
extract_counsel_data.py         # Reads rules/, writes counsel.json
gen_counsel.js                  # Reads counsel.json, writes .docx (requires: npm install docx)
tester/PactoraTester.jsx        # Reference React tester — already fully v2-correct
docs/Pactora_Counsel_Signoff.docx  # Sample generated counsel sign-off document
TASKS.md                        # Remaining task brief
```

### Commands

```sh
# Validate a rule file
python3 pactora_maint.py validate-v2 rules/pactora_rules_termination.yaml

# Staleness report (run after any rule change; 24 unverified civil-law rules expected)
python3 pactora_maint.py staleness rules/

# Counsel pipeline
python3 extract_counsel_data.py rules/ counsel.json
node gen_counsel.js counsel.json docs/Pactora_Counsel_Signoff.docx

# Analysis harness (once Task 1 is complete)
python3 pactora_harness.py --rules-dir rules analyze --mock
```

### Schema v2 invariants — do NOT break these

1. `rule_id` values are stable and never renumbered or reused.
2. `legal_basis` holds authorities only, each `{authority, type}`. Recommendations
   and market-practice statements belong in `engine_interpretation`, not `legal_basis`.
3. A `litigation_risk` or `negotiation_risk` rule's `engine_interpretation` must not
   assert invalidity (no "is void / unenforceable / is invalid / deemed unwritten").
4. Civil-law (Germany, France) rules stay `meta.status: unverified` until counsel
   signs off. Never flip them to verified.
5. The engine must never serve a rule that is not verified or is past its review due
   date. Honour `is_servable()` from `pactora_maint.py`.
6. `overriding_mandatory: true` marks rules that survive a foreign choice-of-law
   clause (IP formalities/moral rights, insolvency bans). It is NOT derived from
   `rule_type: mandatory_law` — do not conflate the two.
7. House style for generated text and docs: British English; hyphens, never em dashes;
   avoid "genuinely", "honestly", "straightforward".

### Workflow rules

- Use plan mode for any change touching the YAML rule files — show the diff before writing.
- After any YAML change: re-run `validate-v2` and `staleness`.
- After any change to the counsel pipeline: re-run `extract_counsel_data.py` and
  confirm the overriding-mandatory count is still 8.
- Do not alter legal content (thresholds, authorities, interpretations) without
  raising it as a note first.
