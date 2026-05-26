// Arm A: Pactora as-is.
//
// Calls runClauseAgent directly for each of the five benchmark clause types,
// bypassing the classifyPresentClauses pre-filter. The pre-filter is a
// cost-saving optimisation that analyses only the first 40k chars — bypassing it
// gives a fairer measure of the extraction agents' own quality.

import { runClauseAgent } from '@/lib/agents/run-clause-agent';
import { BENCHMARK_CLAUSE_TYPES } from '../types';
import type { BenchmarkClauseType, ArmClauseResult, ContractArmResult } from '../types';

export async function runArmA(
  contractText: string,
): Promise<ContractArmResult> {
  const results = await Promise.all(
    BENCHMARK_CLAUSE_TYPES.map(async (clauseType): Promise<[BenchmarkClauseType, ArmClauseResult]> => {
      const agentResult = await runClauseAgent(clauseType, contractText);

      if (!agentResult.ok) {
        return [
          clauseType,
          {
            found: false,
            quotedText: '',
            error: agentResult.error,
            costUsd: 0,
          },
        ];
      }

      const { flag, usage } = agentResult;
      return [
        clauseType,
        {
          found: flag !== null,
          quotedText: flag?.clauseText ?? '',
          riskLevel: flag?.riskLevel,
          costUsd: usage.costUsd,
        },
      ];
    }),
  );

  const clauseResults = Object.fromEntries(results) as Record<
    BenchmarkClauseType,
    ArmClauseResult
  >;

  const totalCostUsd = results.reduce((sum, [, r]) => sum + r.costUsd, 0);

  return {
    arm: 'a',
    clauseResults,
    totalCostUsd,
    cachedFromDisk: false,
  };
}
