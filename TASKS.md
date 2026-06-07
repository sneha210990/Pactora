# Pactora - task brief for Claude Code

> **Status (2026-06-07): Both tasks below are complete.** All verification
> commands pass. See updated counts in the verify sections.

You are working on Pactora, a jurisdiction-aware contract risk engine. The rule
corpus is six YAML files (schema v2) plus tooling. Two tasks were required after
a recent v1 to v2 schema migration. Both are done.

## Orientation - read these first

- `rules/pactora_rules_*.yaml` - the six rule files. All are schema v2.
- `pactora_maint.py` - v2-aware tooling. `is_servable()` is the canonical
  verification gate. `validate-v2`, `staleness`, `scaffold-jurisdiction`.
- `PactoraTester.jsx` - the React tester. Its per-clause prompt and cross-clause
  engine are ALREADY fully on v2. Use it as the reference for correct v2 logic.
- `MAINTENANCE.md` - the schema and the maintenance model.

### Schema v2 invariants - do NOT break these
1. `rule_id` values are stable and never renumbered or reused.
2. `legal_basis` holds authorities only, each `{authority, type}`. Never put a
   recommendation or market-practice statement in `legal_basis`; those belong in
   `engine_interpretation`.
3. A `litigation_risk` or `negotiation_risk` rule's `engine_interpretation` must
   not assert invalidity (no "is void / unenforceable / deemed unwritten").
4. Civil-law (Germany, France) rules stay `meta.status: unverified` until counsel
   signs off. Never flip them to verified.
5. The engine must never serve a rule that is not verified or is past its review
   due date. Honour `is_servable()`.
6. `overriding_mandatory: true` marks rules that survive a foreign choice-of-law
   clause (IP formalities/moral rights, insolvency bans). It is NOT the same as
   `rule_type: mandatory_law`. Do not derive one from the other.
7. House style for any generated text or docs: British English; hyphens, never
   em dashes; avoid the words "genuinely", "honestly", "straightforward".

---

## Task 1 - bring pactora_harness.py up to schema v2

`pactora_harness.py` was written for v1 and is now out of step with the v2 rule
files. Its `analyze` path reads fields that no longer exist, so it will not run
correctly against the current YAML.

Port it to v2, using `PactoraTester.jsx` and `pactora_maint.py` as the reference
implementations (they are already correct). Specifically:

- The per-clause prompt builder reads `jdoc["risk_triggers"]` and
  `jdoc["threshold"]`. In v2 the triggers live under `jdoc["triggers"]` and each
  trigger carries `rule_id`, `rule_type`, `stability`, `legal_basis`,
  `engine_interpretation`, `detection_condition`, optional `excluded_when`.
  Update the prompt to emit these, mirroring the SYSTEM_PROMPT and buildPrompt in
  `PactoraTester.jsx`.
- Apply the verification gate: only pass `is_servable()` rules into the prompt
  (import or replicate `is_servable` from `pactora_maint.py`). Unverified or
  past-due rules must not be served.
- Findings now key on `rule_id`, not `trigger_id`/`rule_ref`. Update
  `run_cross_clause` and its `has()` helper accordingly.
- Replace the hardcoded `MANDATORY_TRIGGERS` set with a set DERIVED from the rule
  files: collect every `rule_id` whose trigger has `overriding_mandatory: true`.
  This must match the tester, which derives the same set. Do not hardcode.
- Update `MOCK_FINDINGS` / `MOCK_FACTS` to the v2 finding shape (see the fixture
  in `PactoraTester.jsx`).
- The harness's own `validate` command is superseded by
  `pactora_maint.py validate-v2`. Either remove it or have it delegate.

### Verify task 1 — DONE ✅
- `python pactora_maint.py validate-v2 rules/pactora_rules_limitation_of_liability.yaml`
  passes: 13 rules, 0 errors.
- `python pactora_harness.py --rules-dir rules analyze --mock` runs and fires 6
  cross-clause rules including `xc_governing_law_vs_mandatory_rules` resolving to
  `FR-IPO-001`. ✅
- The derived mandatory set has **9 members** (not 8 as originally drafted — SC-TERM-001
  was added after this brief was written; its `overriding_mandatory: true` flag is correct
  as the Scotland insolvency ipso facto ban under CIGA 2020). DE-TERM-001 is excluded. ✅

---

## Task 2 - add the overriding-mandatory column to the counsel document

The counsel pipeline is `extract_counsel_data.py` (reads the YAML, writes
`counsel.json`) then `gen_counsel.js` (reads `counsel.json`, writes the .docx).
The extraction already carries an `overriding_mandatory` boolean per rule, but
the generator does not yet show it. Counsel currently signs off each rule but not
its choice-of-law-override status, which is itself a legal classification they
should confirm.

In `gen_counsel.js`:
- In each per-clause jurisdiction table, mark rules where
  `overriding_mandatory === true` with a clear, compact indicator (for example an
  "OMR" tag next to the Rule ID, or a dedicated narrow column). Keep the table
  readable on portrait A4/Letter; widths currently total 9360 dxa, so rebalance
  rather than add width.
- Add a one-line explanation in the "How to use this document" section: that
  rules marked as overriding mandatory are understood to apply regardless of the
  contract's chosen governing law (lois de police / lex protectionis / lex
  concursus), and that counsel is asked to confirm that classification.
- Do not change any legal wording, authorities, or the verified/unverified
  marking.

### Verify task 2 — DONE ✅
- `python extract_counsel_data.py rules/ counsel.json` reports **9 overriding-mandatory**
  (79 rules total). ✅
- `node gen_counsel.js counsel.json Pactora_Counsel_Signoff.docx` runs. ✅
- The 9 flagged rules are the four IP rules (DE-IPO-001, FR-IPO-001, FR-IPO-003,
  IN-IPO-002), the four insolvency rules (EW-TERM-001, IN-TERM-001, DE-TERM-002,
  FR-TERM-001), and SC-TERM-001 (Scotland insolvency ipso facto ban, CIGA 2020).
  DE-TERM-001 is NOT flagged. ✅

---

## After both tasks — DONE ✅
- `python pactora_maint.py staleness rules/` confirms 24 unverified civil-law
  rules (DE + FR), unchanged. ✅
- Do not alter the rule files' legal content. If you believe a legal threshold
  is wrong, raise it as a note - do not silently change it.
