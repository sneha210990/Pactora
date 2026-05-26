// Precision, recall, and F1 scorer for the CUAD benchmark.

import type {
  ContractBenchmarkResult,
  CuadLabel,
  BenchmarkMapping,
  ArmLabel,
  BenchmarkClauseType,
  ClauseScore,
  ArmScore,
} from './types';
import { SCOREABLE_CLAUSE_TYPES, cuadSaysPresent } from './types';

function precision(tp: number, fp: number): number | null {
  if (tp + fp === 0) return null;
  return tp / (tp + fp);
}

function recall(tp: number, fn: number): number | null {
  if (tp + fn === 0) return null;
  return tp / (tp + fn);
}

function f1(p: number | null, r: number | null): number | null {
  if (p === null || r === null) return null;
  if (p + r === 0) return 0;
  return (2 * p * r) / (p + r);
}

export function scoreArm(
  arm: ArmLabel,
  results: ContractBenchmarkResult[],
  labels: CuadLabel[],
  mapping: BenchmarkMapping,
): ArmScore {
  const labelMap = new Map(labels.map((l) => [l.contractId, l]));

  const perClause: ClauseScore[] = SCOREABLE_CLAUSE_TYPES.map((clauseType) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;

    for (const result of results) {
      const label = labelMap.get(result.contractId);
      if (!label) continue;

      const armResult = result.arms[arm];
      if (!armResult) continue;

      const clauseResult = armResult.clauseResults[clauseType];
      if (!clauseResult) continue;

      const cuadPresent = cuadSaysPresent(clauseType, label, mapping);
      if (cuadPresent === null) continue; // Coverage gap — skip

      const pactoraFound = clauseResult.found;

      if (pactoraFound && cuadPresent) tp++;
      else if (pactoraFound && !cuadPresent) fp++;
      else if (!pactoraFound && cuadPresent) fn++;
      // TN (both false) does not contribute to precision/recall
    }

    const p = precision(tp, fp);
    const r = recall(tp, fn);

    return {
      clauseType,
      truePositives: tp,
      falsePositives: fp,
      falseNegatives: fn,
      precision: p,
      recall: r,
      f1: f1(p, r),
    };
  });

  const totalCostUsd = results.reduce((sum, r) => {
    return sum + (r.arms[arm]?.totalCostUsd ?? 0);
  }, 0);

  return {
    arm,
    perClause,
    totalCostUsd,
    contractsScored: results.filter((r) => r.arms[arm] !== undefined).length,
  };
}

export function scoreAllArms(
  results: ContractBenchmarkResult[],
  labels: CuadLabel[],
  mapping: BenchmarkMapping,
): ArmScore[] {
  return (['a', 'b', 'c'] as ArmLabel[]).map((arm) =>
    scoreArm(arm, results, labels, mapping),
  );
}

// ---------------------------------------------------------------------------
// Worked-example selection
// ---------------------------------------------------------------------------

export type WorkedExample = {
  contractId: string;
  filename: string;
  clauseType: BenchmarkClauseType;
  category: 'arm-c-caught' | 'arm-b-beats-pactora' | 'pactora-beats-arm-b';
  cuadPresent: boolean;
  armAFound: boolean;
  armBFound: boolean;
  armCFound: boolean;
  armAQuote: string;
  armBQuote: string;
  armCQuote: string;
  cuadQuote: string;
};

export function selectWorkedExamples(
  results: ContractBenchmarkResult[],
  labels: CuadLabel[],
  mapping: BenchmarkMapping,
): WorkedExample[] {
  const labelMap = new Map(labels.map((l) => [l.contractId, l]));
  const examples: WorkedExample[] = [];

  for (const result of results) {
    const label = labelMap.get(result.contractId);
    if (!label) continue;

    for (const clauseType of SCOREABLE_CLAUSE_TYPES) {
      const cuadPresent = cuadSaysPresent(clauseType, label, mapping);
      if (cuadPresent === null) continue;

      const armA = result.arms['a']?.clauseResults[clauseType];
      const armB = result.arms['b']?.clauseResults[clauseType];
      const armC = result.arms['c']?.clauseResults[clauseType];

      if (!armA || !armB || !armC) continue;

      const aFound = armA.found;
      const bFound = armB.found;
      const cFound = armC.found;

      // Category 1: Arm A missed, Arm C caught (and CUAD confirms present).
      if (!aFound && cFound && cuadPresent) {
        examples.push({
          contractId: result.contractId,
          filename: result.filename,
          clauseType,
          category: 'arm-c-caught',
          cuadPresent,
          armAFound: aFound,
          armBFound: bFound,
          armCFound: cFound,
          armAQuote: armA.quotedText,
          armBQuote: armB.quotedText,
          armCQuote: armC.quotedText,
          cuadQuote: getCuadQuote(label, clauseType, mapping),
        });
      }

      // Category 2: Arm B found and CUAD confirms present, Arm A missed (Arm B beats Pactora).
      if (!aFound && bFound && cuadPresent) {
        examples.push({
          contractId: result.contractId,
          filename: result.filename,
          clauseType,
          category: 'arm-b-beats-pactora',
          cuadPresent,
          armAFound: aFound,
          armBFound: bFound,
          armCFound: cFound,
          armAQuote: armA.quotedText,
          armBQuote: armB.quotedText,
          armCQuote: armC.quotedText,
          cuadQuote: getCuadQuote(label, clauseType, mapping),
        });
      }

      // Category 3: Arm A found and CUAD confirms present, Arm B missed (Pactora beats Arm B).
      if (aFound && !bFound && cuadPresent) {
        examples.push({
          contractId: result.contractId,
          filename: result.filename,
          clauseType,
          category: 'pactora-beats-arm-b',
          cuadPresent,
          armAFound: aFound,
          armBFound: bFound,
          armCFound: cFound,
          armAQuote: armA.quotedText,
          armBQuote: armB.quotedText,
          armCQuote: armC.quotedText,
          cuadQuote: getCuadQuote(label, clauseType, mapping),
        });
      }
    }
  }

  // Return at most 1 arm-c-caught, 2 arm-b-beats-pactora, 2 pactora-beats-arm-b.
  const pick = <T extends { category: string }>(arr: T[], cat: string, max: number): T[] =>
    arr.filter((e) => e.category === cat).slice(0, max);

  return [
    ...pick(examples, 'arm-c-caught', 1),
    ...pick(examples, 'arm-b-beats-pactora', 2),
    ...pick(examples, 'pactora-beats-arm-b', 2),
  ];
}

function getCuadQuote(
  label: CuadLabel,
  clauseType: BenchmarkClauseType,
  mapping: BenchmarkMapping,
): string {
  const m = mapping.clause_mappings[clauseType];
  for (const cat of m.cuad_categories) {
    const val = label.categories[cat];
    if (val && val.trim().length > 0) return val.slice(0, 300);
  }
  return '';
}
