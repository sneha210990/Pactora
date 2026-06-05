# Changelog

All notable changes to Pactora are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-05-30

Initial public beta.

### Added

**AI analysis pipeline**
- 8 specialist clause agents (Liability Cap, Indemnities, IP Ownership, Data Protection,
  Termination, Governing Law, Dispute Resolution, Confidentiality)
- Extended thinking (4 k budget) for the three hardest clause types: Liability Cap,
  Indemnities, IP Ownership
- Prompt-cache optimisation: contract text cached across parallel agents at 10% input cost
- Anti-hallucination verification layer (`flagWithVerification`) — every extracted
  clause text is checked against the source before being surfaced
- Page-number enrichment for flagged clauses
- Long-contract chunking with overlap and dedup merge
- Cross-clause risk engine: deterministic pair checks across all 8 agent outputs
- SSE streaming endpoint (`/api/contracts/analyze-agents`) for progressive UI updates

**Contract ingestion**
- PDF extraction via `pdf-parse` with `serverExternalPackages` workaround
- DOCX extraction via `mammoth`
- `/api/contracts/extract` normalises both formats into a unified payload

**Integrity engine** (deterministic, no LLM)
- Section and definition parser
- Validators: undefined terms, duplicate definitions, dead definitions,
  broken cross-references, inconsistent capitalisation
- Multi-document mode: one structural target set across all uploaded docs

**Negotiation playbook (AI-08)**
- "Suggest redline" for five clause types: Liability Cap, Indemnities, IP Ownership,
  Data Protection, Termination
- Word-level LCS diff with two-column side-by-side rendering
- Extended thinking for IP Ownership and Indemnities redlines

**Rules corpus**
- Jurisdiction-aware YAML rule corpus (schema v2) covering England & Wales, Germany,
  France, India across clause categories
- `pactora_maint.py`: validate-v2, staleness, scaffold-jurisdiction tooling
- Counsel sign-off pipeline: `extract_counsel_data.py` → `gen_counsel.js` → `.docx`

**Application**
- Next.js 16 App Router with React 19 and Tailwind v4
- Supabase-backed cookie sessions
- Deal upload and review flow across six review surfaces
  (LoL, Indemnities, IP, Data, Termination, Summary)
- Jurisdiction selector on analysis start
- Legal disclaimer on all pages
- Cost tracking per API request stored in beta-store

[0.1.0]: https://github.com/sneha210990/Pactora/releases/tag/v0.1.0
