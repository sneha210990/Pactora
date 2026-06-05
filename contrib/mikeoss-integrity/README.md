# Deterministic Contract Integrity Engine for Mike

Adds a `/integrity/:documentId` route to the Mike backend.

The engine is **entirely deterministic — no AI and no API costs**. It parses the raw
contract text and flags five categories of structural issues:

| Check | Severity | What it catches |
|---|---|---|
| `duplicate_definition` | high / medium | Same term defined twice, possibly with conflicting text |
| `undefined_defined_term` | high / medium / low | Capitalised term used as a defined term but never defined |
| `dead_definition` | low | Term is defined but never used after the definition clause |
| `broken_cross_reference` | high / medium | `Section 4.2` or `Schedule B` referenced but not found in the document set |
| `inconsistent_capitalization` | medium / low | Defined term used in lowercase in a context that looks intentional |

It also supports **multi-document analysis**: upload an MSA and its Schedule together
and the engine validates cross-document references.

---

## Integration steps

### 1. Copy files

```
cp -r contrib/mikeoss-integrity/src/lib/integrity  backend/src/lib/integrity
cp    contrib/mikeoss-integrity/src/routes/integrity.ts  backend/src/routes/integrity.ts
```

No new npm dependencies are needed — `pdfjs-dist` and `mammoth` are already in
the project.

### 2. Register the route in `backend/src/index.ts`

```ts
import integrityRouter from "./routes/integrity";

// Add alongside the other app.use() calls:
app.use("/integrity", integrityRouter);
```

### 3. Done

```bash
# Test with an uploaded document ID:
curl -X POST http://localhost:3000/integrity/<documentId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Multi-document (e.g. MSA + Schedule):
curl -X POST http://localhost:3000/integrity/<msaDocumentId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "additionalDocumentIds": ["<scheduleDocumentId>"] }'
```

---

## Response shape

```jsonc
{
  "id": "integrity-report-...",
  "generatedAt": "2026-05-31T...",
  "summary": {
    "documentCount": 1,
    "issueCount": 4,
    "issuesBySeverity": { "critical": 0, "high": 1, "medium": 2, "low": 1, "info": 0 },
    "issuesByType": { "undefined_defined_term": 2, "broken_cross_reference": 1, "dead_definition": 1 }
  },
  "documents": [
    { "id": "...", "title": "MSA v3.docx", "kind": "msa", "sectionCount": 18, "definitionCount": 12, "referenceCount": 34 }
  ],
  "issues": [
    {
      "type": "broken_cross_reference",
      "severity": "high",
      "message": "Section 7.3 is referenced in MSA v3.docx but no matching section target was found in the uploaded document set.",
      "locations": [
        {
          "documentId": "...",
          "documentTitle": "MSA v3.docx",
          "sectionNumber": "7",
          "sectionHeading": "Liability",
          "line": 142,
          "excerpt": "…subject to the cap set out in Section 7.3 of this Agreement…"
        }
      ],
      "metadata": { "referenceText": "Section 7.3", "missingTarget": "section:7.3", "targetType": "section", "targetLabel": "7.3" }
    }
    // ...
  ]
}
```

---

## Extending with custom validators

The engine accepts an optional `validators` array as a second argument to
`runIntegrityEngine`. Each validator is a plain object:

```ts
import { runIntegrityEngine } from '../lib/integrity/engine';
import type { IntegrityValidator } from '../lib/integrity/types';

const myValidator: IntegrityValidator = {
  id: 'undefined_defined_term', // reuse an existing issue type or add a new one
  description: 'My custom check',
  validate(context) {
    // context.documents — parsed contracts
    // context.definitionsByTerm — Map<normalizedTerm, ContractDefinition[]>
    // context.structuralTargets — Set<string> of "section:4.1", "schedule:a", etc.
    return [];
  },
};

const report = runIntegrityEngine(inputs, [...DEFAULT_INTEGRITY_VALIDATORS, myValidator]);
```

---

## Origin

This engine was developed in [Pactora](https://github.com/sneha210990/pactora) and
contributed to Mike under the same AGPL-3.0 licence.
