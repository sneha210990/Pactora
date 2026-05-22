# Pactora

AI-powered contract review for SaaS buyers. Upload a contract, get clause-level risk flags, negotiation ladders, and redline suggestions in seconds.

## Running locally

```bash
pnpm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY + Supabase vars
pnpm dev                     # http://localhost:3000
```

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Next.js dev server (port 3000) |
| `pnpm build && pnpm start` | Production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm qa` | Playwright workflow suite (67 tests) |
| `pnpm qa:report` | Open last Playwright HTML report |

## Architecture

Next.js 16 App Router · React 19 · Tailwind v4 · Supabase auth · Anthropic Claude

Two analysis pipelines:
- **AI pipeline** — 8 parallel specialist clause agents (Sonnet + extended thinking for hard clauses, Haiku for the rest), SSE streaming, cross-clause risk engine
- **Integrity engine** — deterministic validator (undefined terms, broken cross-refs, duplicate definitions) — no LLM

See [`CLAUDE.md`](CLAUDE.md) for full architecture notes.

---

## Roadmap

### ✅ Phase 0 — Shipped

| Issue | Feature |
|---|---|
| MVP-01 | Limitation of Liability module |
| MVP-02 | Indemnities module (cross-clause aware) |
| MVP-03 | Cross-clause interaction engine |
| AI-01 | 8 specialist clause agents (parallel, SSE streaming) |
| AI-03 | Negotiation ladder on every flag card |
| AI-03a | Redline suggestion — buyer-protective alternative clause language |
| AI-08 | Full negotiation playbook — side-by-side diff renderer, all 5 clause types, extended thinking for IP Ownership + Indemnities, clause-specific prompt rules |
| — | Deals history — save and restore past contract reviews |
| — | Export analysis as PDF |
| — | Drag-and-drop upload (PDF + DOCX) |
| — | Auth — email login, session management, logged-in nav state |
| — | Playwright workflow suite (67 tests, 0 failures) |

---

### 🔨 Phase 1 — In progress (Weeks 4–8, Starter £49/month)

| Issue | Feature | Effort |
|---|---|---|
| [AI-09 #138](https://github.com/sneha210990/Pactora/issues/138) | **Downloadable redlined contract — DOCX with tracked changes** | ~6–8h |
| [AI-07 #99](https://github.com/sneha210990/Pactora/issues/99) | Contract type detection — adjust risk benchmarks per type (SaaS, NDA, employment…) | ~4–5h |
| [AI-06 #80](https://github.com/sneha210990/Pactora/issues/80) | Haiku pre-classification — skip absent clause agents, reduce cost | ~3–4h |
| [AI-02 #76](https://github.com/sneha210990/Pactora/issues/76) | Multi-turn conversational review — ask follow-up questions about any flag | ~4–5h |
| [TRUST-01 #97](https://github.com/sneha210990/Pactora/issues/97) | Confidence indicator on ambiguous flags | ~3–4h |
| [TRUST-02 #101](https://github.com/sneha210990/Pactora/issues/101) | Audit trail — who reviewed what, when, at which version | ~4–5h |
| [SCANNER-01 #98](https://github.com/sneha210990/Pactora/issues/98) | Email capture on free scanner result page | ~2–3h |

---

### 🗓 Phase 2 — Growth (Months 2–4, £99/month)

| Issue | Feature | Effort |
|---|---|---|
| [AI-04 #78](https://github.com/sneha210990/Pactora/issues/78) | Vision for scanned PDFs — fallback when text extraction fails | ~4–5h |
| [PRODUCT-01 #102](https://github.com/sneha210990/Pactora/issues/102) | Passive clause library instrumentation — anonymised collection | ~3–4h |

---

### 🗓 Phase 3 — Scale (Months 4–8)

| Issue | Feature | Effort |
|---|---|---|
| [AI-05 #79](https://github.com/sneha210990/Pactora/issues/79) | Batch API — portfolio analysis at 50% cost via Anthropic Batch API | ~6–8h |

---

### 🗓 Phase 4 — Enterprise/API (Q4 2026+)

| Issue | Feature |
|---|---|
| [PRODUCT-02 #104](https://github.com/sneha210990/Pactora/issues/104) | Clause library — searchable market standard benchmarks |
