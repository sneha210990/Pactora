import { useMemo } from 'react';
import { useDocumentAnalysis } from '@/lib/document-analysis-store';

type RiskLevel = 'Low' | 'Medium' | 'High';

const SECTIONS: Array<{ key: string; fragment: string }> = [
  { key: 'lol', fragment: 'liability' },
  { key: 'indemnities', fragment: 'indemnit' },
  { key: 'ip', fragment: 'ip' },
  { key: 'data', fragment: 'data' },
  { key: 'termination', fragment: 'terminat' },
];

function inferLolRisk(lolCap: number | null, acv: number | null): RiskLevel | null {
  if (!lolCap || lolCap <= 0 || !acv || acv <= 0) return null;
  const ratio = lolCap / acv;
  return ratio < 1 ? 'High' : ratio <= 2 ? 'Medium' : 'Low';
}

export function useSectionRisks(): Partial<Record<string, RiskLevel>> {
  const analysis = useDocumentAnalysis();

  return useMemo(() => {
    const lolCap = analysis.commercialContext.liabilityCap;
    const acv = analysis.commercialContext.acv.value;
    const inferredLolRisk = inferLolRisk(lolCap, acv);

    const result: Partial<Record<string, RiskLevel>> = {};
    for (const { key, fragment } of SECTIONS) {
      const canonical = analysis.risks.find((r) =>
        r.clauseType.toLowerCase().includes(fragment),
      );
      const level = canonical?.level as RiskLevel | undefined;
      const risk = key === 'lol' ? (inferredLolRisk ?? level ?? null) : (level ?? null);
      if (risk !== null) result[key] = risk;
    }
    return result;
  }, [analysis.risks, analysis.commercialContext]);
}
