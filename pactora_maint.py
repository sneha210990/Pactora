#!/usr/bin/env python3
"""
pactora_maint.py - schema-v2 maintenance tooling for the Pactora rule engine.

Commands (run standalone, or import the functions):

    # Validate a v2 rule file's structure + the legal_basis/interpretation split
    python pactora_maint.py validate-v2 rules/pactora_rules_limitation_of_liability.yaml

    # Show every rule whose verification is overdue or unverified, as of today
    python pactora_maint.py staleness rules/ [--asof YYYY-MM-DD]

    # Generate a blank-but-structured new jurisdiction from a template jurisdiction
    python pactora_maint.py scaffold-jurisdiction rules/ singapore --from england_wales --code SG

Design intent
-------------
* The MECHANICAL half of maintenance is automated here: structure checks,
  staleness computation, and scaffolding a new jurisdiction's skeleton.
* The LEGAL half is never automated: a scaffolded jurisdiction's legal_basis
  fields are emitted blank and marked status: unverified, and the staleness
  gate refuses to treat any unverified or past-due rule as servable.
"""

import argparse
import datetime as dt
import os
import sys

try:
    import yaml
except ImportError:
    sys.exit("pyyaml required: pip install pyyaml --break-system-packages")

RULE_TYPES = {"mandatory_law", "litigation_risk", "negotiation_risk",
              "drafting_risk", "operational_risk"}
STABILITIES = {"settled", "context_sensitive", "evolving", "jurisdictionally_variable"}
AUTHORITY_TYPES = {"statute", "case", "regulation", "construction", "market_practice"}
SEVERITIES = {"high", "medium", "low", "info"}
DEFAULT_CADENCE = {"settled": 24, "context_sensitive": 12,
                   "evolving": 3, "jurisdictionally_variable": 6}

# words that, if they appear in a legal_basis authority string, suggest the
# entry is really an interpretation / market-practice statement misfiled as law
INTERP_LEAK_WORDS = ["consider", "recommend", "should", "mutual cap",
                     "negotiate", "prefer", "advisable", "best practice"]


def load(path):
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def iter_triggers(doc):
    for jname, jdoc in (doc.get("jurisdictions") or {}).items():
        for t in (jdoc.get("triggers") or []):
            yield jname, t


# --------------------------------------------------------------------------- #
# validate-v2
# --------------------------------------------------------------------------- #
def validate_v2(path):
    doc = load(path)
    issues = []
    err = lambda w, m: issues.append(("ERROR", w, m))
    warn = lambda w, m: issues.append(("WARN", w, m))

    if doc.get("schema_version") != 2:
        err(os.path.basename(path), "schema_version is not 2")
        return issues

    seen_ids = set()
    for jname, t in iter_triggers(doc):
        rid = t.get("rule_id", "<no-id>")
        w = rid
        for f in ("rule_id", "rule_type", "stability", "severity",
                  "detection_condition", "legal_basis", "engine_interpretation", "meta"):
            if f not in t:
                err(w, f"missing field: {f}")
        if rid in seen_ids:
            err(w, "duplicate rule_id")
        seen_ids.add(rid)
        if t.get("rule_type") not in RULE_TYPES:
            err(w, f"rule_type '{t.get('rule_type')}' invalid")
        if t.get("stability") not in STABILITIES:
            err(w, f"stability '{t.get('stability')}' invalid")
        if t.get("severity") not in SEVERITIES:
            err(w, f"severity '{t.get('severity')}' invalid")

        # legal_basis: list of {authority, type}; types must be valid;
        # and statute/case/regulation entries must not contain interp-leak words
        lb = t.get("legal_basis") or []
        if not lb:
            err(w, "legal_basis is empty")
        for entry in lb:
            if not isinstance(entry, dict) or "authority" not in entry or "type" not in entry:
                err(w, "legal_basis entry must have authority + type"); continue
            if entry["type"] not in AUTHORITY_TYPES:
                err(w, f"authority type '{entry['type']}' invalid")
            if entry["type"] in {"statute", "case", "regulation"}:
                low = entry["authority"].lower()
                hit = [k for k in INTERP_LEAK_WORDS if k in low]
                if hit:
                    err(w, f"interpretation leaked into a {entry['type']} authority "
                           f"(found {hit}); move to engine_interpretation")

        # rule_type vs interpretation language: enforceability rules may assert
        # invalidity; risk rules must not
        ei = (t.get("engine_interpretation") or "").lower()
        if t.get("rule_type") in {"litigation_risk", "negotiation_risk"}:
            if any(p in ei for p in ["is void", "is unenforceable", "is invalid", "deemed unwritten"]):
                warn(w, f"{t.get('rule_type')} rule asserts invalidity in engine_interpretation; "
                        "soften to a risk statement")

        # overriding_mandatory: optional bool; only meaningful on mandatory_law rules
        om=t.get("overriding_mandatory")
        if om is not None:
            if not isinstance(om,bool):
                err(w,"overriding_mandatory must be boolean")
            elif om and t.get("rule_type")!="mandatory_law":
                warn(w,"overriding_mandatory set on a non-mandatory_law rule")
        # meta block
        meta = t.get("meta") or {}
        for f in ("last_verified", "verified_by", "review_cadence_months", "status"):
            if f not in meta:
                err(w, f"meta missing: {f}")
        if meta.get("status") not in {"verified", "unverified", "stale"}:
            err(w, f"meta.status '{meta.get('status')}' invalid")
        # cadence sanity vs stability default
        exp = DEFAULT_CADENCE.get(t.get("stability"))
        if exp and meta.get("review_cadence_months") and meta["review_cadence_months"] > exp:
            warn(w, f"cadence {meta['review_cadence_months']}mo is slower than the "
                    f"{t.get('stability')} default ({exp}mo)")

    n_err = sum(1 for i in issues if i[0] == "ERROR")
    for lvl, where, msg in issues:
        print(f"  {lvl:5} {where}: {msg}")
    print(f"\n{os.path.basename(path)}: {len(seen_ids)} v2 rules, "
          f"{n_err} error(s), {len(issues) - n_err} warning(s).")
    return issues


# --------------------------------------------------------------------------- #
# staleness  (the automatable monthly worklist)
# --------------------------------------------------------------------------- #
def add_months(d, months):
    m = d.month - 1 + months
    y = d.year + m // 12
    m = m % 12 + 1
    day = min(d.day, [31, 29 if y % 4 == 0 and (y % 100 or not y % 400) else 28,
                      31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1])
    return dt.date(y, m, day)


def staleness(rules_dir, asof=None):
    asof = asof or dt.date.today()
    rows = []
    for fn in sorted(os.listdir(rules_dir)):
        if not (fn.startswith("pactora_rules_") and fn.endswith(".yaml")):
            continue
        doc = load(os.path.join(rules_dir, fn))
        if doc.get("schema_version") != 2:
            rows.append(("--", fn, "n/a", "SKIPPED v1 (no meta)", "-"))
            continue
        for jname, t in iter_triggers(doc):
            meta = t.get("meta") or {}
            rid = t.get("rule_id")
            status = meta.get("status")
            if status == "unverified":
                rows.append((t.get("severity"), rid, jname, "UNVERIFIED", "needs first sign-off"))
                continue
            lv = meta.get("last_verified")
            cad = meta.get("review_cadence_months")
            if not lv or not cad:
                rows.append((t.get("severity"), rid, jname, "NO DATE", "missing last_verified/cadence"))
                continue
            lvd = lv if isinstance(lv, dt.date) else dt.date.fromisoformat(str(lv))
            due = add_months(lvd, cad)
            if due < asof:
                rows.append((t.get("severity"), rid, jname, "OVERDUE", f"due {due.isoformat()}"))

    sev_rank = {"high": 0, "medium": 1, "low": 2, "info": 3, "--": 9}
    rows.sort(key=lambda r: (sev_rank.get(r[0], 9), r[1]))
    print(f"Staleness report as of {asof.isoformat()}")
    print(f"{'sev':6} {'rule_id':14} {'jurisdiction':16} {'state':12} note")
    print("-" * 78)
    for sev, rid, j, state, note in rows:
        print(f"{sev:6} {rid:14} {j:16} {state:12} {note}")
    actionable = [r for r in rows if r[3] in {"UNVERIFIED", "OVERDUE", "NO DATE"}]
    print(f"\n{len(actionable)} rule(s) need attention.")
    return rows


# --------------------------------------------------------------------------- #
# scaffold-jurisdiction  (automate the skeleton, never the law)
# --------------------------------------------------------------------------- #
def scaffold_jurisdiction(rules_dir, new_j, from_j, code):
    code = code.upper()
    made = []
    for fn in sorted(os.listdir(rules_dir)):
        if not (fn.startswith("pactora_rules_") and fn.endswith(".yaml")):
            continue
        if "cross_clause" in fn:
            continue
        path = os.path.join(rules_dir, fn)
        doc = load(path)
        if doc.get("schema_version") != 2:
            print(f"  skip {fn}: not v2 yet")
            continue
        js = doc.get("jurisdictions") or {}
        if from_j not in js:
            print(f"  skip {fn}: template '{from_j}' not present")
            continue
        if new_j in js:
            print(f"  skip {fn}: '{new_j}' already exists")
            continue
        clause_id = doc.get("clause_id")
        tmpl = js[from_j]
        new_triggers = []
        for i, t in enumerate(tmpl.get("triggers") or [], start=1):
            new_triggers.append({
                "rule_id": f"{code}-{clause_id}-{i:03d}",
                "rule_type": t.get("rule_type"),
                "stability": "jurisdictionally_variable",
                "severity": t.get("severity"),
                "detection_condition": t.get("detection_condition"),
                "legal_basis": [{"authority": "TODO: confirm local authority", "type": "statute"}],
                "non_excludable": [],
                "engine_interpretation": "TODO: confirm interpretation under " + new_j,
                "depends_on": [],
                "meta": {
                    "last_verified": None,
                    "verified_by": None,
                    "review_cadence_months": 6,
                    "status": "unverified",
                    "source_urls": [],
                },
            })
        js[new_j] = {"legal_system": tmpl.get("legal_system"), "triggers": new_triggers}
        doc["jurisdictions"] = js
        with open(path, "w", encoding="utf-8") as fh:
            yaml.safe_dump(doc, fh, sort_keys=False, allow_unicode=True, width=100)
        made.append((fn, len(new_triggers)))
    print(f"Scaffolded '{new_j}' (code {code}) into {len(made)} file(s):")
    for fn, n in made:
        print(f"  {fn}: {n} blank rules ({code}-*-NNN), all status: unverified")
    print("\nNext step (human, not automated): fill each legal_basis with the actual "
          "local authority and set status: verified. The staleness gate lists them as "
          "UNVERIFIED until then.")
    return made


# --------------------------------------------------------------------------- #
# gate helper - importable by the analysis pipeline
# --------------------------------------------------------------------------- #
def is_servable(trigger, asof=None):
    """True only if the rule is verified AND not past its review due date."""
    asof = asof or dt.date.today()
    meta = trigger.get("meta") or {}
    if meta.get("status") != "verified":
        return False
    lv, cad = meta.get("last_verified"), meta.get("review_cadence_months")
    if not lv or not cad:
        return False
    lvd = lv if isinstance(lv, dt.date) else dt.date.fromisoformat(str(lv))
    return add_months(lvd, cad) >= asof


def main():
    ap = argparse.ArgumentParser(description="Pactora v2 maintenance tooling")
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate-v2"); v.add_argument("file")
    s = sub.add_parser("staleness"); s.add_argument("rules_dir"); s.add_argument("--asof")
    sc = sub.add_parser("scaffold-jurisdiction")
    sc.add_argument("rules_dir"); sc.add_argument("new_jurisdiction")
    sc.add_argument("--from", dest="from_j", required=True)
    sc.add_argument("--code", required=True)
    a = ap.parse_args()
    if a.cmd == "validate-v2":
        sys.exit(1 if any(i[0] == "ERROR" for i in validate_v2(a.file)) else 0)
    if a.cmd == "staleness":
        staleness(a.rules_dir, dt.date.fromisoformat(a.asof) if a.asof else None); sys.exit(0)
    if a.cmd == "scaffold-jurisdiction":
        scaffold_jurisdiction(a.rules_dir, a.new_jurisdiction, a.from_j, a.code); sys.exit(0)


if __name__ == "__main__":
    main()
