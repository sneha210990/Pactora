#!/usr/bin/env python3
"""
extract_counsel_data.py - read the six v2 rule files and emit counsel.json,
the input the counsel-document generator (gen_counsel.js) consumes.

Usage:
    python extract_counsel_data.py rules/ counsel.json

This is the single extraction step for the counsel pipeline. Run it after any
change to the rule YAML, then run `node gen_counsel.js` to rebuild the .docx.
"""
import sys, json, yaml, os

FILES = {
    "LOL": ("Limitation of Liability", "pactora_rules_limitation_of_liability.yaml"),
    "IND": ("Indemnities", "pactora_rules_indemnities.yaml"),
    "IPO": ("IP Ownership", "pactora_rules_ip_ownership.yaml"),
    "DP":  ("Data Protection", "pactora_rules_data_protection.yaml"),
    "TERM": ("Termination", "pactora_rules_termination.yaml"),
}
JLAB = {"england_wales": "England & Wales", "india": "India", "germany": "Germany",
        "france": "France", "european_union": "European Union", "united_kingdom": "United Kingdom"}


def main():
    rules_dir = sys.argv[1] if len(sys.argv) > 1 else "rules"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "counsel.json"
    clauses = []
    for cid, (name, fn) in FILES.items():
        d = yaml.safe_load(open(os.path.join(rules_dir, fn), encoding="utf-8"))
        assert d.get("schema_version") == 2, f"{fn} is not schema v2"
        js = []
        for j, jd in d["jurisdictions"].items():
            tr = []
            for t in jd.get("triggers", []):
                tr.append({
                    "rule_id": t["rule_id"],
                    "rule_type": t["rule_type"],
                    "stability": t["stability"],
                    "severity": t["severity"],
                    "overriding_mandatory": bool(t.get("overriding_mandatory")),
                    "legal_basis": [f"{b['authority']} [{b['type']}]" for b in t.get("legal_basis", [])],
                    "interp": (t.get("engine_interpretation") or "").strip().replace("\n", " "),
                    "status": t["meta"]["status"],
                    "excluded_when": t.get("excluded_when"),
                })
            js.append({"key": j, "label": JLAB.get(j, j),
                       "legal_system": jd.get("legal_system", ""), "triggers": tr})
        clauses.append({"id": cid, "name": name, "jurisdictions": js,
                        "fallback": d.get("fallback_ladder", {})})
    cross = yaml.safe_load(open(os.path.join(rules_dir, "pactora_rules_cross_clause.yaml"), encoding="utf-8"))
    crules = [{"cid": r.get("cross_rule_id"), "id": r["id"], "severity": r["severity"],
               "message": r["message"], "recommendation": r["recommendation"]} for r in cross["rules"]]
    json.dump({"clauses": clauses, "cross": crules}, open(out_path, "w"), ensure_ascii=False)
    tot = sum(len(j["triggers"]) for c in clauses for j in c["jurisdictions"])
    om = sum(1 for c in clauses for j in c["jurisdictions"] for t in j["triggers"] if t["overriding_mandatory"])
    print(f"wrote {out_path}: {tot} rules, {om} overriding-mandatory")


if __name__ == "__main__":
    main()
