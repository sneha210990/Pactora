# Pactora — Repo Status Audit
**Date:** 2026-05-25  
**Scope:** Full codebase audit — features, git history, TODOs, build status, launch blockers

---

## Feature Checklist

| Feature | Status | Last Touched | Launch Blocker? |
|---|---|---|---|
| Clause Extraction (LoL + Indemnity) | ✅ Complete | 2026-05-24 | No |
| Redline Suggestion (AI-08) | ✅ Complete | 2026-05-24 | No |
| Redline Download DOCX (AI-09 Phase 1+2) | ✅ Complete | 2026-05-25 | No |
| Sign-up / Auth (Supabase) | ⚠️ Partial — code done, middleware disabled | 2026-05-23 | **Yes** |
| Payments (Stripe) | ❌ Not started — zero code | — | **Yes** |
| Free Tier Tracking (per-user count) | ❌ Not implemented | — | **Yes** |
| Paywall Logic | ❌ Not implemented | — | **Yes** |
| Full end-to-end flow (upload → analysis → redline → download) | ✅ Complete (no auth gate) | 2026-05-25 | No |

---

## Detailed Feature Findings

### 1. Clause Extraction (LoL + Indemnity) — ✅ Complete

- `lib/contract-extraction.ts` handles regex extraction (ACV, term, insurance, data type) + `lib/ai-extraction.ts` runs Haiku in parallel for a merged result.
- `lib/agents/clause-prompts.ts`: Liability Cap prompt has 30+ phrase patterns (`"shall not exceed"`, `"limited to the fees"`, `"aggregate liability"`, etc.). Indemnity prompt covers `"indemnify"`, `"hold harmless"`, `"save harmless"`, `"keep indemnified"`, and more.
- `lib/chunking-strategy.ts`: 100k-char chunks with 5k overlap and sentence-boundary nudging. Multi-chunk merge + dedup implemented in `mergeChunkResults`.
- Anti-hallucination: `flagWithVerification` in `lib/agents/hallucination-check.ts` uses Levenshtein fuzzy match (95% threshold) against source text.
- 8 specialist agents: `Liability Cap`, `Indemnities`, `IP Ownership`, `Data Protection`, `Termination Rights`, `Auto-Renewal`, `Fee Increases`, `Governing Law`.

### 2. Redline Download — ✅ Complete (all 5 safety checks in place)

| Safety Check | Status | Location |
|---|---|---|
| Magic-byte validation (0x50 0x4B 0x03 0x04) | ✅ Yes | `app/api/contracts/redline/export/route.ts` lines 53–58 |
| SessionStorage quota error handling | ✅ Yes | `app/deals/new/page.tsx` lines 218–222 |
| XML validation via `@xmldom/xmldom` | ✅ Yes | `app/api/contracts/redline/export/route.ts` lines 87–104 |
| Overlap detection (dedup Set) | ✅ Yes | `app/api/contracts/redline/export/route.ts` lines 64–73 |
| DOCX failure → PDF fallback | ✅ Yes | `components/download-redline-button.tsx` lines 83–85 |

### 3. Authentication — ⚠️ Partial

- Supabase email/password + Google OAuth: **code is complete** (`lib/supabase-auth.ts`, `app/api/auth/login/route.ts`, `app/api/auth/google/route.ts`, `app/login/page.tsx`).
- **Critical gap:** `middleware.ts` auth gate is **manually disabled** with the comment: *"Auth gate temporarily disabled — re-enable once Supabase env vars are set on Vercel."*
- All routes are currently publicly accessible. No user is required to sign in before uploading or analyzing a contract.
- Session stored as HTTP-only cookie (`pactora_session`), 30-day expiry.

### 4. Payments — ❌ Not Started

- Zero Stripe code anywhere in the repository.
- `package.json` has no Stripe dependency.
- No payment API routes. No billing UI. No pricing tier concept.
- Entirely absent.

### 5. Free Tier Tracking — ❌ Not Implemented

- `lib/beta-store.ts` tracks API usage (tokens, cost, model) per request and `contractsProcessed` globally — but **not per user**.
- No `MAX_FREE_REVIEWS` constant. No enforcement check in any API route.
- `app/api/contracts/analyze-agents/route.ts` has **no usage gate** — any anonymous user can run unlimited analyses at Anthropic API cost.

### 6. Paywall Logic — ❌ Not Implemented

- Does not exist anywhere in the codebase.
- No gating, no upgrade prompt, no plan concept.

---

## Git History (last 30 commits)

```
d9a96c7  2026-05-25  Merge PR #156 — hey-jude evaluation
2ea8e04  2026-05-25  Revert "Add hey-jude privacy gateway spike test"
d5f5419  2026-05-25  Revert "Add hey-jude Playwright E2E spike"
c09862f  2026-05-25  Add hey-jude Playwright E2E spike
e29ece0  2026-05-25  Merge PR #155 — hey-jude evaluation
32a1f91  2026-05-25  Add hey-jude privacy gateway spike test
1ac8208  2026-05-25  Merge PR #154 — docx-download-pipeline phase 1
8e198f8  2026-05-24  Fix DOCX redline integrity — Phase 2 (formatting & data quality)
61c86a2  2026-05-25  Merge PR #153 — docx-download-pipeline phase 1
bdb2f82  2026-05-24  Fix DOCX download pipeline — Phase 1 (three silent failures)
6b34b3c  2026-05-24  Merge PR #152 — results-page-ux-fixes
189fed1  2026-05-24  Fix bottom-of-page order: Export PDF → Back to home → Feedback
197a5d9  2026-05-24  Merge PR #151 — results-page-ux-fixes
cfc79a7  2026-05-24  Results page: 4 UX fixes for conversion funnel
5ec62e4  2026-05-23  Merge PR #150 — ux-review
46f8c78  2026-05-23  AI-07: contract type detection — store, SSE handler, and banner UI
3172b4d  2026-05-23  AI-07 (partial): contract type detection — server-side pipeline
6eb3223  2026-05-23  Merge PR #149 — ux-review
5c45809  2026-05-23  TRUST-01: Add confidence indicators for uncertain clause flags
876533f  2026-05-23  Merge PR #142 — daily-report-summary
9ced0b0  2026-05-23  Merge PR #148 — ux-review
a01d8b6  2026-05-23  Add Playwright tests for DOCX redline download (AI-09)
fa86eea  2026-05-23  Fix redline download: fall back to markup schedule PDF on DOCX export failure
1fec34d  2026-05-23  Revert clause-prompts.ts to US English
1fec34d  2026-05-23  Use UK English throughout all user-visible text and AI prompts
84692ab  2026-05-23  Merge PR #147 — ux-review
aab1279  2026-05-23  UX fixes: focus ring, styled modal, aria-live, aria-invalid, tooltip, mobile email
c2105c1  2026-05-23  Merge PR #146 — pactora-times-india-link
09c8e87  2026-05-23  Fix TOI press badge: self-host icon, add serif wordmark
28f8c40  2026-05-23  Merge PR #145 — pactora-times-india-link
```

---

## Open TODOs / FIXMEs

**Total annotated issues in source: 1**

| File | Line | Tag | Description |
|---|---|---|---|
| `tests/workflow.spec.ts` | 1166 | `BUG-01` | "New review clears stale contract data" — regression test for a fixed bug. Covered by Test 66. Not blocking. |

Zero `TODO`, `FIXME`, `HACK`, or `XXX` comments in any `.ts` / `.tsx` source file.

---

## Build Status

**All npm dependencies are declared.** No missing packages. `next.config.ts` correctly externalizes `pdf-parse`, `jszip`, `@ansonlai/docx-redline-js`, `@xmldom/xmldom` for the Node runtime. No build-breaking config issues found.

**Minor TypeScript issues** (not build-breaking, but will fail strict lint):

| File | Lines | Issue |
|---|---|---|
| `lib/document-analysis-store.tsx` | 621–626 | 6 implicit-`any` parameters in dispatch functions |
| `app/api/contracts/negotiate/route.ts` | 105 | Implicit-`any` on `.find()` callback parameter |
| `app/api/contracts/redline/route.ts` | 75 | Implicit-`any` on `.find()` callback parameter |

**Verdict: Build would succeed after `pnpm install`.** The TypeScript issues above are linting warnings, not hard build failures.

---

## Launch Blockers (Prioritised)

### Priority 1 — Must fix before launch

**1. Auth gate is disabled**
- File: `middleware.ts`
- Fix: Re-enable the auth guard protecting `/deals/new`, `/review/*`, and `/api/contracts/*`
- Dependency: Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be set on Vercel first
- Effort: ~10 lines of code, 1 hour

**2. No per-user free tier limit**
- Risk: Any visitor can run unlimited Anthropic API calls at your cost right now
- Fix: Add `reviews_used: number` to `BetaUser` in `lib/beta-store.ts`, increment on extract, return HTTP 402 from `analyze-agents` when limit hit
- Effort: ~1 day

**3. No payments infrastructure**
- If monetisation is part of the mid-June plan: Stripe Checkout + webhook handler + entitlement check = ~1–2 weeks
- If free beta only: the usage limit above (blocker #2) is still required for cost control
- Minimum viable path: single `/api/billing/checkout` route + `/api/billing/webhook` using Stripe's hosted Checkout page — no custom billing UI needed for v1

### Priority 2 — Fix before launch, lower urgency

**4. `beta-store.ts` uses `/tmp` filesystem**
- On Vercel, `/tmp` is ephemeral per serverless function instance
- User records, sessions, and API usage logs do not survive cold starts or redeployments
- Auth sessions can silently break after a deploy
- Fix: Migrate to Supabase (schema already designed in `prisma/schema.prisma`) or at minimum persist to Supabase KV

### Priority 3 — Nice to have

**5. Implicit-any TypeScript warnings**
- 8 parameters across 3 files
- Fix: Add explicit types to dispatch functions in `lib/document-analysis-store.tsx:621–626` and two `.find()` callbacks
- Effort: ~30 minutes

---

## Recommendations

**Week 1 (now → June 1)**
1. Set Supabase env vars on Vercel
2. Re-enable auth middleware (`middleware.ts`) — one PR
3. Add per-user review counter and HTTP 402 gate in `analyze-agents` route — one PR

**Week 2 (June 2–8)**
4. Integrate Stripe Checkout (hosted page, no custom UI): `POST /api/billing/checkout` + `POST /api/billing/webhook` — one PR
5. Migrate `beta-store.ts` to Supabase for persistent user/session records

**Before launch (June 9–14)**
6. Fix TypeScript implicit-any warnings (quick cleanup)
7. End-to-end QA: sign-up → analyze → hit free limit → upgrade via Stripe → analyze again

---

## Summary

The **core product is complete and well-engineered.** The full loop — upload contract → 8-agent AI analysis → clause review pages → redline suggestion → DOCX download — works correctly, with anti-hallucination checks, PDF fallback, and a full Playwright test suite (~68 tests).

The **gaps are entirely on the business layer**: the auth gate is turned off, there are no usage limits, and there is no payment infrastructure. These are three targeted PRs away from a viable launch. None of them require changes to the core analysis or redline pipeline.

---

*Generated by Claude Code audit — 2026-05-25*
