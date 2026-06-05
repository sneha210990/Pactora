// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { ClauseFlag } from '@/lib/clause-analysis';

export type CrossClauseRisk = {
  id: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  primaryClause: string;
  relatedClause: string;
  headline: string;
  plainEnglish: string;
  negotiationPoint: string;
};

function includesAny(text: string, signals: string[]): boolean {
  return signals.some((s) => text.includes(s));
}

function clauseText(flag: ClauseFlag): string {
  return [flag.clauseText ?? '', flag.problematicLanguage ?? ''].join(' ').toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Three cross-clause interaction checks, run after all 8 agents complete.
// Each check looks at a pair of flags and applies deterministic pattern
// matching — the same signals used in the individual review pages, but now
// evaluated together and surfaced in the summary before the user drills in.
// ─────────────────────────────────────────────────────────────────────────────

export function detectCrossClauseRisks(flags: ClauseFlag[]): CrossClauseRisk[] {
  const risks: CrossClauseRisk[] = [];
  const flagMap = new Map(flags.map((f) => [f.clauseType, f]));

  const indemnities = flagMap.get('Indemnities');
  const cap = flagMap.get('Liability Cap');
  const ip = flagMap.get('IP Ownership');
  const data = flagMap.get('Data Protection');

  // ── 1. Indemnity ↔ Liability Cap override ─────────────────────────────────
  // Risk: indemnity contains "notwithstanding" / carve-out language that
  // displaces the cap, or both clauses independently flagged as High risk.
  if (indemnities && cap) {
    const indText = clauseText(indemnities);
    const capText_ = clauseText(cap);

    const capOverrideSignals = [
      'notwithstanding the limitation of liability',
      'notwithstanding the liability cap',
      'notwithstanding any other',
      'notwithstanding anything',
      'cap shall not apply',
      'outside the limitation of liability',
      'unlimited indemnity',
      'shall not be limited',
      'not subject to the limitation',
      'not subject to clause',
    ];

    const hasCapOverride =
      includesAny(indText, capOverrideSignals) ||
      includesAny(capText_, capOverrideSignals);
    const bothHigh = indemnities.riskLevel === 'High' && cap.riskLevel === 'High';

    if (hasCapOverride || bothHigh) {
      risks.push({
        id: 'indemnity_cap_override',
        riskLevel: hasCapOverride ? 'High' : 'Medium',
        primaryClause: 'Indemnities',
        relatedClause: 'Liability Cap',
        headline: 'Indemnity may override the liability cap',
        plainEnglish: hasCapOverride
          ? 'The indemnity clause contains language that carves it out of the liability cap, creating potentially uncapped financial exposure.'
          : 'Both the indemnity and liability cap carry high individual risk. If the indemnity is not explicitly subject to the cap, exposure could be effectively uncapped.',
        negotiationPoint:
          'Insist all indemnity obligations are explicitly subject to the liability cap. Remove or narrow any "notwithstanding" carve-outs.',
      });
    }
  }

  // ── 2. IP Ownership ↔ Indemnity exposure ──────────────────────────────────
  // Risk: vendor claims broad IP over customer outputs/data AND the indemnity
  // clause requires the customer to indemnify the vendor — the customer may
  // end up indemnifying for IP it no longer owns.
  if (ip && indemnities) {
    const ipText = clauseText(ip);

    const broadIPSignals = [
      'all intellectual property',
      'assigns to vendor',
      'vendor shall own',
      'work made for hire',
      'irrevocable',
      'perpetual',
      'royalty-free',
      'feedback',
      'improvements',
      'derivative works',
      'anonymised',
      'aggregated data',
      'training data',
    ];

    const hasBroadIP = ip.riskLevel === 'High' || includesAny(ipText, broadIPSignals);
    const indemnitiesRisky = indemnities.riskLevel !== 'Low';

    if (hasBroadIP && indemnitiesRisky) {
      risks.push({
        id: 'ip_indemnity_exposure',
        riskLevel: ip.riskLevel === 'High' && indemnities.riskLevel === 'High' ? 'High' : 'Medium',
        primaryClause: 'IP Ownership',
        relatedClause: 'Indemnities',
        headline: 'IP assignment compounds indemnity exposure',
        plainEnglish:
          "The vendor claims broad rights over your outputs or data while also requiring you to indemnify them against third-party IP claims. You may end up indemnifying the vendor for IP you no longer own.",
        negotiationPoint:
          'Carve out customer data and bespoke configurations from IP assignment. Limit indemnities to pre-existing third-party IP claims — not vendor-assigned IP.',
      });
    }
  }

  // ── 3. Data Protection ↔ Liability Cap carve-out ──────────────────────────
  // Risk: the liability cap explicitly carves out data protection obligations,
  // or data protection is flagged High while the cap is also inadequate.
  if (data && cap) {
    const capText_ = clauseText(cap);
    const dataText = clauseText(data);

    const capCarveoutSignals = [
      'notwithstanding',
      'shall not apply',
      'not apply',
      'excluding',
      'except for',
      'nothing in this agreement limits',
    ];
    const dataSignals = ['data protection', 'data breach', 'personal data', 'gdpr', 'privacy', 'data processing'];
    const sensitiveDataSignals = ['sensitive', 'special category', 'health data', 'financial data', 'biometric'];

    const dataCarvedOutOfCap =
      includesAny(capText_, capCarveoutSignals) && includesAny(capText_, dataSignals);
    const dataHighCapHigh = data.riskLevel === 'High' && cap.riskLevel === 'High';
    const hasSensitiveData = includesAny(dataText, sensitiveDataSignals);

    if (dataCarvedOutOfCap || (dataHighCapHigh && hasSensitiveData)) {
      risks.push({
        id: 'data_carveout_cap_bypass',
        riskLevel: dataCarvedOutOfCap ? 'High' : 'Medium',
        primaryClause: 'Data Protection',
        relatedClause: 'Liability Cap',
        headline: 'Data breach liability may fall outside the liability cap',
        plainEnglish: dataCarvedOutOfCap
          ? 'The liability cap explicitly carves out data protection obligations, meaning a data breach could expose you to unlimited liability regardless of the negotiated cap.'
          : 'You are processing sensitive personal data under a contract with high data protection risk. Verify whether data breach liability is explicitly capped.',
        negotiationPoint:
          'Negotiate a defined sub-cap for data breach liability (e.g. 2–3× ACV). Avoid leaving data protection entirely outside the liability cap.',
      });
    }
  }

  return risks;
}
