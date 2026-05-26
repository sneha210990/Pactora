# Third-Party Notices

This file lists third-party components whose licences or attribution requirements
apply to code in this repository.

---

## Grounding verification techniques

**File:** `benchmark/cuad/grounding.ts`

The grounding-verification approach used in `benchmark/cuad/grounding.ts` —
specifically the three-tier match strategy (exact substring, normalised-whitespace,
windowed character-overlap), the boilerplate-phrase half-weight filter, and the
10,000-character window cap to prevent O(n×m) complexity blow-up — is conceptually
inspired by the `grounding-verifier.ts` module in the **Lavern** project
(Apache License 2.0).

The implementation in this repository was written independently and does not
reproduce Lavern source code verbatim. Where patterns are similar, they reflect
common techniques in document-grounding tooling rather than direct copying.

Lavern is copyright its respective contributors and is made available under the
Apache License, Version 2.0. A copy of the Apache 2.0 licence text is available at:
https://www.apache.org/licenses/LICENSE-2.0

---

## CUAD dataset

The Contract Understanding Atticus Dataset (CUAD) is used as the evaluation
benchmark in `benchmark/cuad/`. CUAD is published by the Atticus Project and
licensed under the Creative Commons Attribution 4.0 International (CC BY 4.0)
licence.

CUAD is **not redistributed** in this repository. Users must download it
separately by following the instructions in `benchmark/cuad/download.md`.

Attribution: Atticus Project AI (https://www.atticusprojectai.org/cuad).

CC BY 4.0 licence text: https://creativecommons.org/licenses/by/4.0/
