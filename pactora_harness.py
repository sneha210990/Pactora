#!/usr/bin/env python3
"""
pactora_harness.py - v2 analysis pipeline for the Pactora rule engine.

Usage:
    python3 pactora_harness.py --rules-dir rules analyze --mock
    python3 pactora_harness.py --rules-dir rules analyze [--facts facts.json] [--jurisdictions j1 j2] < contract.txt
    python3 pactora_harness.py --rules-dir rules validate <file>   # delegates to pactora_maint.py

Oracle: tester/PactoraTester.jsx. When in doubt about v2 behaviour, match the tester.

Two traps to avoid:
  1. Derive MANDATORY_RULE_IDS from overriding_mandatory: true — NOT from rule_type == mandatory_law.
  2. Apply is_servable() from pactora_maint.py so unverified / past-due rules never reach the prompt.
"""
import argparse
import json
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("pyyaml required: pip install pyyaml")

from pactora_maint import is_servable


# ──────────────────────────────────────────────────────────────────────────────
# Rule loading
# ──────────────────────────────────────────────────────────────────────────────

CLAUSE_FILES = {
    "LOL":  "pactora_rules_limitation_of_liability.yaml",
    "IND":  "pactora_rules_indemnities.yaml",
    "IPO":  "pactora_rules_ip_ownership.yaml",
    "DP":   "pactora_rules_data_protection.yaml",
    "TERM": "pactora_rules_termination.yaml",
}
CLAUSE_ORDER = ["LOL", "IND", "IPO", "DP", "TERM"]

# DP jurisdiction mapping (mirrors DP_FOR_GOVLAW in PactoraTester.jsx)
DP_FOR_GOVLAW = {
    "england_wales": "united_kingdom", "united_kingdom": "united_kingdom",
    "germany":       "european_union", "france":         "european_union",
    "european_union": "european_union", "india":          "india",
}


def load_rules(rules_dir):
    rules = {}
    for cid, fn in CLAUSE_FILES.items():
        path = os.path.join(rules_dir, fn)
        with open(path, encoding="utf-8") as fh:
            doc = yaml.safe_load(fh)
        if doc.get("schema_version") != 2:
            sys.exit(f"ERROR: {fn} is not schema v2 — run: python3 pactora_maint.py validate-v2 {path}")
        rules[cid] = doc
    return rules


def load_cross_rules(rules_dir):
    path = os.path.join(rules_dir, "pactora_rules_cross_clause.yaml")
    with open(path, encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def derive_mandatory_rule_ids(rules):
    """
    Collect every rule_id where overriding_mandatory is true.
    Derived from the rule files at load time — never hardcoded.

    IMPORTANT: this is NOT rule_type == 'mandatory_law'. A rule can be mandatory_law
    without surviving a foreign choice-of-law clause, and vice versa. Do not conflate.
    """
    ids = set()
    for doc in rules.values():
        for jdoc in (doc.get("jurisdictions") or {}).values():
            for t in (jdoc.get("triggers") or []):
                if t.get("overriding_mandatory"):
                    ids.add(t["rule_id"])
    return ids


# ──────────────────────────────────────────────────────────────────────────────
# Per-clause prompt + API call
# Mirrors buildPrompt / SYSTEM_PROMPT / callClaude from PactoraTester.jsx
# ──────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are a contracts-law specialist analysing one clause type under one jurisdiction. "
    "Apply ONLY the rules supplied. Return STRICT JSON: an array of findings, each with keys "
    "rule_id, clause_id, jurisdiction, severity, rule_type, stability, legal_basis, "
    "engine_interpretation, evidence_span. Use ONLY a rule_id and legal_basis present in the "
    "supplied rules; never invent authorities. Tailor engine_interpretation to the clause but do "
    "NOT assert invalidity for litigation_risk or negotiation_risk rules. Respect excluded_when. "
    "evidence_span must quote the contract text. If nothing fires, return []. JSON only."
)


def build_prompt(cid, jkey, jdoc, contract_text):
    """
    Build the per-clause user prompt.
    Only is_servable() rules are included — unverified and past-due rules are excluded here,
    so the model can never see or fire them.
    """
    servable = [t for t in (jdoc.get("triggers") or []) if is_servable(t)]
    payload = {
        "clause_id": cid,
        "jurisdiction": jkey,
        "rules": [
            {
                "rule_id":             t["rule_id"],
                "rule_type":           t["rule_type"],
                "stability":           t["stability"],
                "severity":            t["severity"],
                "detection_condition": t.get("detection_condition"),
                "excluded_when":       t.get("excluded_when"),
                "legal_basis":         t.get("legal_basis", []),
                "engine_interpretation": (t.get("engine_interpretation") or "").strip(),
            }
            for t in servable
        ],
    }
    return (
        "RULES:\n" + json.dumps(payload, indent=2) +
        "\n\nCONTRACT:\n" + contract_text +
        "\n\nReturn the findings JSON array now."
    )


def parse_findings(text):
    """Parse JSON findings from a model response, tolerating code-fence wrappers."""
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(json)?", "", t, flags=re.IGNORECASE).rstrip("`").strip()
    s, e = t.find("["), t.rfind("]")
    if s != -1 and e != -1:
        t = t[s: e + 1]
    try:
        o = json.loads(t)
        return o if isinstance(o, list) else []
    except json.JSONDecodeError:
        return []


def call_claude(user_prompt, model="claude-sonnet-4-6"):
    try:
        import anthropic
    except ImportError:
        sys.exit("anthropic SDK required: pip install anthropic")
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model=model, max_tokens=1800,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    text = "".join(b.text for b in msg.content if b.type == "text")
    return parse_findings(text)


def plan_run(rules, governing_law, extra_jurisdictions=()):
    """Build analysis plan (list of [cid, jkey] pairs). Mirrors planRun in PactoraTester.jsx."""
    jset = {governing_law} | set(extra_jurisdictions)
    plan = []
    for cid in CLAUSE_ORDER:
        avail = set(rules[cid]["jurisdictions"].keys())
        if cid == "DP":
            wanted = {DP_FOR_GOVLAW.get(j, j) for j in jset}
            plan.extend((cid, j) for j in wanted if j in avail)
        else:
            plan.extend((cid, j) for j in jset if j in avail)
    return plan


# ──────────────────────────────────────────────────────────────────────────────
# Cross-clause engine
# Faithful Python port of runCrossClause from tester/PactoraTester.jsx.
# Keyed on rule_id (not trigger_id / rule_ref).
# Mandatory set comes from overriding_mandatory, not rule_type.
# ──────────────────────────────────────────────────────────────────────────────

SURVIVAL_REQUIRED = [
    "confidentiality", "ip assignment/licence", "liability cap",
    "indemnities", "data deletion/return",
]


def has(findings, clause_id, contains=None, id_in=None, type_in=None):
    """
    Mirror has() from PactoraTester.jsx.
    Matches on clause_id, with optional filters: rule_id substring, rule_id set, rule_type set.
    """
    for f in findings:
        if clause_id and f.get("clause_id") != clause_id:
            continue
        rid = f.get("rule_id", "")
        if contains is not None and contains not in rid:
            continue
        if id_in is not None and rid not in id_in:
            continue
        if type_in is not None and f.get("rule_type") not in type_in:
            continue
        return True
    return False


def _survival_present(req, sl):
    """
    Token-matching logic ported from runCrossClause in PactoraTester.jsx:
        r.split("/")[0].split(" ").some((tok) => s.includes(tok))
    sl is a list of lowercased strings from facts.survival_list.
    """
    tokens = req.split("/")[0].split(" ")
    return any(tok in s for tok in tokens for s in sl)


def run_cross_clause(findings, facts, cross_rules_doc, mandatory_rule_ids):
    """
    Deterministic cross-clause pass.
    Faithful Python port of runCrossClause from tester/PactoraTester.jsx.
    Match the tester — do not improvise.
    """
    meta = {r["id"]: r for r in cross_rules_doc["rules"]}
    out = []

    def fire(rule_id, detail=None):
        r = dict(meta[rule_id])
        r["status"] = "fired"
        r["detail"] = detail
        out.append(r)

    def need(rule_id, missing):
        r = dict(meta[rule_id])
        r["status"] = "needs_input"
        r["missing"] = missing
        out.append(r)

    # XC-001: indemnity outside cap
    ind_outside_cap = any(
        f.get("clause_id") == "IND" and
        re.search(r"outside the cap|defeat|unlimited exposure|notwithstanding the cap",
                  f.get("engine_interpretation", ""), re.IGNORECASE)
        for f in findings
    )
    if facts.get("liability_cap_present") and ind_outside_cap:
        fire("xc_indemnity_outside_cap")

    # XC-002: IP indemnity vs ownership defect
    ind_ip = any(
        f.get("clause_id") == "IND" and
        re.search(r"\bIP\b|infringement|garantie|freistellung",
                  f.get("engine_interpretation", ""), re.IGNORECASE)
        for f in findings
    )
    ipo_defect = any(
        f.get("clause_id") == "IPO" and
        f.get("rule_type") in {"mandatory_law", "drafting_risk"}
        for f in findings
    )
    if ind_ip and ipo_defect:
        fire("xc_ip_indemnity_vs_ownership")

    # XC-003: survival gap
    if facts.get("term_clause_present") or has(findings, "TERM"):
        if facts.get("survival_list") is None:
            need("xc_survival_gap", "survival_list")
        else:
            sl = [s.lower() for s in facts["survival_list"]]
            missing = [r for r in SURVIVAL_REQUIRED if not _survival_present(r, sl)]
            if missing:
                fire("xc_survival_gap", {"missing": missing})

    # XC-004: data breach vs cap
    if any(
        f.get("clause_id") == "DP" and
        re.search(r"breach", f.get("engine_interpretation", ""), re.IGNORECASE)
        for f in findings
    ):
        fire("xc_data_breach_vs_cap")

    # XC-005: governing law vs mandatory rules
    if facts.get("governing_law") is None:
        need("xc_governing_law_vs_mandatory_rules", "governing_law")
    else:
        gov = facts["governing_law"]
        others = {
            p for p in [
                facts.get("place_of_ip_creation"),
                facts.get("place_of_data_processing"),
                facts.get("place_of_performance"),
            ]
            if p and p != gov
        }
        conflicts = [
            f"{f['jurisdiction']}:{f['rule_id']}"
            for f in findings
            if f.get("rule_id") in mandatory_rule_ids and f.get("jurisdiction") in others
        ]
        if conflicts:
            fire("xc_governing_law_vs_mandatory_rules", {"conflicts": conflicts})

    # XC-006: termination penalty vs cap
    if any(
        f.get("clause_id") == "TERM" and
        re.search(r"penalty", f.get("engine_interpretation", ""), re.IGNORECASE)
        for f in findings
    ):
        fire("xc_termination_penalty_vs_cap")

    # XC-007: carve-out consistency
    if facts.get("liability_cap_carveouts") is None:
        need("xc_carveout_consistency", "liability_cap_carveouts")
    elif ind_outside_cap:
        fire("xc_carveout_consistency",
             {"note": "an indemnity escapes the cap; confirm it is in the carve-out list"})

    return out


# ──────────────────────────────────────────────────────────────────────────────
# Mock fixture
# Matches MOCK_FINDINGS / MOCK_FACTS in tester/PactoraTester.jsx exactly.
# ──────────────────────────────────────────────────────────────────────────────

MOCK_FINDINGS = [
    {"clause_id": "LOL", "jurisdiction": "england_wales", "rule_id": "EW-LOL-001",
     "rule_type": "mandatory_law", "stability": "settled", "severity": "high", "status": "verified",
     "legal_basis": [{"authority": "Unfair Contract Terms Act 1977, s.2(1)", "type": "statute"},
                     {"authority": "HIH Casualty v Chase Manhattan Bank [2003] UKHL 6", "type": "case"}],
     "engine_interpretation": "Cap/exclusion lacks the mandatory carve-outs; the relevant limb is likely unenforceable.",
     "evidence_span": "In no event shall the Supplier be liable..."},
    {"clause_id": "IND", "jurisdiction": "england_wales", "rule_id": "EW-IND-001",
     "rule_type": "negotiation_risk", "stability": "settled", "severity": "high", "status": "verified",
     "legal_basis": [{"authority": "construction (interaction with the LoL cap)", "type": "construction"}],
     "engine_interpretation": "Indemnity sits outside the cap and is uncapped, defeating the negotiated cap.",
     "evidence_span": "...shall indemnify, notwithstanding the cap..."},
    {"clause_id": "IND", "jurisdiction": "france", "rule_id": "FR-IND-004",
     "rule_type": "drafting_risk", "stability": "settled", "severity": "high", "status": "unverified",
     "legal_basis": [{"authority": "Code civil arts. 1626 ff. (garantie d'eviction)", "type": "statute"}],
     "engine_interpretation": "Unqualified IP-infringement garantie over work created in France.",
     "evidence_span": "shall indemnify against all third-party IP infringement claims"},
    {"clause_id": "IPO", "jurisdiction": "france", "rule_id": "FR-IPO-001",
     "rule_type": "mandatory_law", "stability": "settled", "severity": "high", "status": "unverified",
     "legal_basis": [{"authority": "Code civil art. L131-1", "type": "statute"}],
     "engine_interpretation": "Global assignment of future works is null under L131-1; limit to determinable works.",
     "evidence_span": "Consultant hereby assigns all future intellectual property"},
    {"clause_id": "TERM", "jurisdiction": "england_wales", "rule_id": "EW-TERM-003",
     "rule_type": "litigation_risk", "stability": "settled", "severity": "medium", "status": "verified",
     "legal_basis": [{"authority": "Cavendish Square v Makdessi [2015] UKSC 67", "type": "case"}],
     "engine_interpretation": "Termination payment may be an unenforceable penalty if disproportionate to a legitimate interest.",
     "evidence_span": "shall on termination pay GBP 500,000"},
]

MOCK_FACTS = {
    "governing_law":          "england_wales",
    "place_of_ip_creation":   "france",
    "place_of_data_processing": "european_union",
    "place_of_performance":   "england_wales",
    "liability_cap_present":  True,
    "liability_cap_carveouts": ["fraud", "death/personal injury"],
    "term_clause_present":    True,
    "survival_list":          ["confidentiality", "liability cap"],
}


# ──────────────────────────────────────────────────────────────────────────────
# Output
# ──────────────────────────────────────────────────────────────────────────────

SEV_RANK = {"high": 0, "medium": 1, "low": 2, "info": 3}


def print_results(findings, cross):
    print(f"\nPer-clause findings: {len(findings)}")
    for f in sorted(findings, key=lambda x: (SEV_RANK.get(x.get("severity"), 9),
                                              x.get("clause_id", ""), x.get("jurisdiction", ""))):
        tag = "" if f.get("status") == "verified" else "  [UNVERIFIED]"
        print(f"  {f.get('severity','?'):6} {f.get('rule_id','?'):14} "
              f"{f.get('clause_id','?')}/{f.get('jurisdiction','?')}{tag}")

    fired = [r for r in cross if r.get("status") == "fired"]
    needs = [r for r in cross if r.get("status") == "needs_input"]
    print(f"\nCross-clause pass: {len(fired)} fired, {len(needs)} needs_input")
    for r in sorted(cross, key=lambda x: SEV_RANK.get(x.get("severity"), 9)):
        marker = "FIRE" if r["status"] == "fired" else "NEED"
        label  = r.get("cross_rule_id", r["id"])
        print(f"  [{marker}] {label} ({r.get('severity','?')})  {r['id']}")
        if r["status"] == "fired" and r.get("detail"):
            d = r["detail"]
            if isinstance(d, dict) and "conflicts" in d:
                print(f"           conflicts: {d['conflicts']}")
            elif isinstance(d, dict) and "missing" in d:
                print(f"           missing: {d['missing']}")
            elif d:
                print(f"           {d}")


# ──────────────────────────────────────────────────────────────────────────────
# CLI
# ──────────────────────────────────────────────────────────────────────────────


def main():
    ap = argparse.ArgumentParser(description="Pactora v2 analysis harness")
    ap.add_argument("--rules-dir", default="rules", metavar="DIR",
                    help="Directory containing the six YAML rule files")
    sub = ap.add_subparsers(dest="cmd", required=True)

    an = sub.add_parser("analyze", help="Run per-clause + cross-clause analysis")
    an.add_argument("--mock", action="store_true",
                    help="Use built-in mock fixture (no API calls)")
    an.add_argument("--facts", metavar="FILE",
                    help="JSON file with contract facts (live mode)")
    an.add_argument("--jurisdictions", nargs="*", default=[], metavar="J",
                    help="Extra jurisdictions beyond governing_law (live mode)")
    an.add_argument("--output", metavar="FILE",
                    help="Write JSON results to this file")

    va = sub.add_parser("validate", help="Delegate to pactora_maint.py validate-v2")
    va.add_argument("file")

    args = ap.parse_args()

    if args.cmd == "validate":
        import subprocess
        here = os.path.dirname(os.path.abspath(__file__))
        result = subprocess.run(
            [sys.executable, os.path.join(here, "pactora_maint.py"), "validate-v2", args.file])
        sys.exit(result.returncode)

    # Load corpus
    rules           = load_rules(args.rules_dir)
    cross_rules_doc = load_cross_rules(args.rules_dir)
    mandatory_ids   = derive_mandatory_rule_ids(rules)

    print(f"Rules loaded. Mandatory (overriding) rule IDs ({len(mandatory_ids)}): "
          f"{sorted(mandatory_ids)}")

    if args.mock:
        findings = MOCK_FINDINGS
        facts    = MOCK_FACTS
        print(f"Mock fixture: {len(findings)} per-clause findings")
    else:
        contract_text = sys.stdin.read().strip()
        if not contract_text:
            sys.exit("ERROR: no contract text on stdin")
        facts = {}
        if args.facts:
            with open(args.facts, encoding="utf-8") as fh:
                facts = json.load(fh)
        gov = facts.get("governing_law", "england_wales")
        plan = plan_run(rules, gov, args.jurisdictions)
        print(f"\nPlan: {len(plan)} clause/jurisdiction pairs")
        findings = []
        for cid, jkey in plan:
            jdoc     = rules[cid]["jurisdictions"][jkey]
            servable = [t for t in (jdoc.get("triggers") or []) if is_servable(t)]
            if not servable:
                print(f"  skip {cid}/{jkey} — no servable rules (all unverified or past-due)")
                continue
            print(f"  analysing {cid}/{jkey}  ({len(servable)} servable rules)...",
                  end=" ", flush=True)
            fs = call_claude(build_prompt(cid, jkey, jdoc, contract_text))
            for f in fs:
                f.setdefault("clause_id", cid)
                f.setdefault("jurisdiction", jkey)
            findings.extend(fs)
            print(f"{len(fs)} finding(s)")

    cross = run_cross_clause(findings, facts, cross_rules_doc, mandatory_ids)
    print_results(findings, cross)

    if args.output:
        payload = {
            "schema_version": 2,
            "per_clause_findings": findings,
            "cross_clause": cross,
            "mandatory_rule_ids": sorted(mandatory_ids),
        }
        with open(args.output, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)
        print(f"\nResults written to {args.output}")


if __name__ == "__main__":
    main()
