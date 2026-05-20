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

## Conventions specific to this repo

- When wiring a new review surface, import from `@/lib/document-analysis-store` — never re-derive extracted contract data from query strings or `localStorage`.
- New extraction payloads must be normalized inside `hydrateExtraction`/`hydrateAnalysis` *before* components consume them.
- New clause types: add to `PACTORA_CLAUSE_AGENTS` in [lib/agents/types.ts](lib/agents/types.ts), add system prompt in [lib/agents/clause-prompts.ts](lib/agents/clause-prompts.ts), decide Haiku vs Sonnet+thinking in `EXTENDED_THINKING_CLAUSE_TYPES`.
- Override `clauseType` from the known agent identity, not the model's returned string (see `run-clause-agent.ts` — guards against category hallucination).
- `pdf-parse` is in `serverExternalPackages` because its `createRequire` path defeats Next's static tracer. If touching extraction, preserve `outputFileTracingIncludes` in `next.config.ts`.
- Tests excluded from `tsconfig.json`; Vitest has its own `@` alias in `vitest.config.ts`.
