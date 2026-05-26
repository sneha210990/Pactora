// Shared types for the CUAD benchmark harness.

export const BENCHMARK_CLAUSE_TYPES = [
  'Liability Cap',
  'Indemnities',
  'IP Ownership',
  'Termination Rights',
  'Data Protection',
] as const;

export type BenchmarkClauseType = (typeof BENCHMARK_CLAUSE_TYPES)[number];

// Clause types that can be scored against CUAD (Data Protection has no CUAD mapping).
export const SCOREABLE_CLAUSE_TYPES: BenchmarkClauseType[] = [
  'Liability Cap',
  'Indemnities',
  'IP Ownership',
  'Termination Rights',
];

export type ArmLabel = 'a' | 'b' | 'c';

// Result for a single clause type within a single arm run.
export type ArmClauseResult = {
  found: boolean;
  quotedText: string;
  riskLevel?: 'High' | 'Medium' | 'Low';
  // Arm C only: whether the quoted text was confirmed to exist in the source.
  grounded?: boolean;
  error?: string;
  costUsd: number;
};

// All clause results for one arm on one contract.
export type ContractArmResult = {
  arm: ArmLabel;
  clauseResults: Partial<Record<BenchmarkClauseType, ArmClauseResult>>;
  totalCostUsd: number;
  cachedFromDisk: boolean;
};

// Full benchmark result for one contract across all three arms.
export type ContractBenchmarkResult = {
  contractId: string;
  filename: string;
  arms: Partial<Record<ArmLabel, ContractArmResult>>;
};

// One row from the CUAD master_clauses.csv.
export type CuadLabel = {
  contractId: string;
  // Filename without directory prefix, e.g. "OFFICEDEPOT_04-24-2001-EX-10.18-SUPPLY AGREEMENT"
  documentName: string;
  // Raw CUAD column values keyed by column header. Non-empty string = clause present.
  categories: Record<string, string>;
};

// Clause mapping loaded from mapping.json.
export type ClauseMapping = {
  cuad_categories: string[];
  logic: 'any' | 'all';
  notes: string;
};

export type BenchmarkMapping = {
  version: string;
  notes: string;
  cuad_categories_required: string[];
  clause_mappings: Record<BenchmarkClauseType, ClauseMapping>;
  improvement_suggestions: string[];
};

// Whether CUAD says a clause is present in a given contract.
export function cuadSaysPresent(
  clauseType: BenchmarkClauseType,
  label: CuadLabel,
  mapping: BenchmarkMapping,
): boolean | null {
  const m = mapping.clause_mappings[clauseType];
  if (!m || m.cuad_categories.length === 0) return null; // Coverage gap
  if (m.logic === 'any') {
    return m.cuad_categories.some((cat) => {
      const val = label.categories[cat];
      return typeof val === 'string' && val.trim().length > 0;
    });
  }
  return m.cuad_categories.every((cat) => {
    const val = label.categories[cat];
    return typeof val === 'string' && val.trim().length > 0;
  });
}

// Per-clause precision/recall scores.
export type ClauseScore = {
  clauseType: BenchmarkClauseType;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number | null; // null when TP+FP=0
  recall: number | null;    // null when TP+FN=0
  f1: number | null;
};

export type ArmScore = {
  arm: ArmLabel;
  perClause: ClauseScore[];
  totalCostUsd: number;
  contractsScored: number;
};
