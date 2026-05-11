# Document analysis state migration notes

Pactora now treats `DocumentAnalysisState` as the canonical source of truth for uploaded document extraction, clause detection, risk analysis, recommendations, and parser diagnostics.

## Canonical flow

1. `/deals/new` dispatches `uploadStarted(file)` before sending the file to `/api/contracts/extract`.
2. The extraction response hydrates the global store with document metadata, raw text, extracted terms, and commercial context through `hydrateExtraction(payload)`.
3. Clause analysis runs against the returned raw text and hydrates clauses, risks, recommendations, confidence scores, and processing step completion through `hydrateAnalysis(analysis)`.
4. Review pages read extracted values and detected clause text from `useDocumentAnalysis`, `useDocumentCommercialContext`, and `useClauseByType`.
5. The summary page ranks and displays risks from `analysis.risks`; it no longer reads query-string risk fallbacks or legacy clause-analysis local storage.

## Empty-state policy

Components must not invent legal or commercial content when the parser misses data. Use explicit empty states such as:

- `Clause not detected`
- `No governing law identified`
- `Analysis incomplete`
- `Not identified`

## Remaining migration guidance

When adding or refactoring review components:

- Import canonical selectors from `@/lib/document-analysis-store` instead of reading query params or component-local storage for extracted contract data.
- Keep user-authored draft edits local to the component, but never persist those edits as extracted parser truth unless a dedicated store action is added.
- If a backend endpoint begins returning richer structured payloads, normalize it in `hydrateExtraction` or `hydrateAnalysis` first, then let components consume selectors.
- Keep diagnostic warnings in development while parser formats are still evolving so hydration mismatches and missing fields are visible during QA.
