#!/usr/bin/env tsx
// Main orchestrator for the CUAD benchmark.
//
// Usage:
//   pnpm benchmark:cuad                        # n=50, budget=$5
//   N=5 BUDGET=1 pnpm benchmark:cuad           # smoke test
//   N=20 BUDGET=3 pnpm benchmark:cuad          # custom
//
// Required env: ANTHROPIC_API_KEY
// Optional env: N (default 50), BUDGET (default 5.0), SEED (default 42)

import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Load .env.local before anything that needs process.env
// ---------------------------------------------------------------------------
(function loadEnvLocal() {
  const envFile = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envFile)) return;
  const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
})();

// ---------------------------------------------------------------------------
// Imports — after env is set so Anthropic SDK can read the API key
// ---------------------------------------------------------------------------
import { parseCuadCsv, loadContractText } from './cuad-parser';
import { sampleContracts, logSampleDistribution } from './sample';
import { readArmCache, writeArmCache, getCacheStats } from './cache';
import { runArmA } from './arms/arm-a-pactora';
import { runArmB } from './arms/arm-b-baseline';
import { runArmC } from './arms/arm-c-fallback';
import { scoreAllArms, selectWorkedExamples } from './score';
import { generateReport, writeReport, writeResultsJson } from './report';
import { BENCHMARK_CLAUSE_TYPES } from './types';
import type {
  CuadLabel,
  BenchmarkMapping,
  ContractBenchmarkResult,
  ArmLabel,
  ContractArmResult,
  BenchmarkClauseType,
  ArmClauseResult,
} from './types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const N = parseInt(process.env.N ?? '50', 10);
const BUDGET_USD = parseFloat(process.env.BUDGET ?? '5.0');
const SEED = parseInt(process.env.SEED ?? '42', 10);

const BENCHMARK_DIR = __dirname;
const DATA_DIR = path.join(BENCHMARK_DIR, 'data');
const CSV_PATH = path.join(DATA_DIR, 'master_clauses.csv');
const TXT_DIR = path.join(DATA_DIR, 'full_contract_txt');
const MAPPING_PATH = path.join(BENCHMARK_DIR, 'mapping.json');

// ---------------------------------------------------------------------------
// Pre-flight checks
// ---------------------------------------------------------------------------
function preflight(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[error] ANTHROPIC_API_KEY is not set.');
    console.error('  Export it in your shell or add it to .env.local before running the benchmark.');
    process.exit(1);
  }

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`[error] CUAD CSV not found at: ${CSV_PATH}`);
    console.error('  Follow the instructions in benchmark/cuad/download.md to set up the dataset.');
    process.exit(1);
  }

  if (!fs.existsSync(TXT_DIR)) {
    console.error(`[error] CUAD text directory not found at: ${TXT_DIR}`);
    console.error('  Follow the instructions in benchmark/cuad/download.md to set up the dataset.');
    process.exit(1);
  }

  console.log('[config] n=%d  budget=$%s  seed=%d', N, BUDGET_USD.toFixed(2), SEED);
}

// ---------------------------------------------------------------------------
// Budget guard
// ---------------------------------------------------------------------------
class BudgetExceededError extends Error {
  constructor(spent: number, cap: number) {
    super(`Budget cap of $${cap.toFixed(2)} reached (spent $${spent.toFixed(4)})`);
  }
}

// ---------------------------------------------------------------------------
// Run a single arm for one contract, using the disk cache when available.
// ---------------------------------------------------------------------------
async function runArm(
  arm: ArmLabel,
  contractId: string,
  contractText: string,
  totalSpent: number,
): Promise<ContractArmResult> {
  // Check full-arm cache first.
  const cached = readArmCache(contractId, arm, [...BENCHMARK_CLAUSE_TYPES]);
  if (cached) {
    const totalCostUsd = Object.values(cached).reduce(
      (sum: number, r) => sum + (r as ArmClauseResult).costUsd,
      0,
    );
    return {
      arm,
      clauseResults: cached,
      totalCostUsd,
      cachedFromDisk: true,
    };
  }

  // Guard against budget overrun before issuing API calls.
  if (totalSpent >= BUDGET_USD) {
    throw new BudgetExceededError(totalSpent, BUDGET_USD);
  }

  let result: ContractArmResult;
  if (arm === 'a') {
    result = await runArmA(contractText);
  } else if (arm === 'b') {
    result = await runArmB(contractText);
  } else {
    const armC = await runArmC(contractText);
    if (armC.fallbackFired.length > 0) {
      console.log(
        `    [arm-c] Fallback fired for: ${armC.fallbackFired.join(', ')}`,
      );
    }
    result = armC;
  }

  // Persist to cache.
  writeArmCache(
    contractId,
    arm,
    result.clauseResults as Record<BenchmarkClauseType, ArmClauseResult>,
  );

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  preflight();

  console.log('\n[cuad] Loading dataset...');
  const allLabels = parseCuadCsv(CSV_PATH);
  console.log(`[cuad] Loaded ${allLabels.length} contracts from CSV.`);

  const mapping: BenchmarkMapping = JSON.parse(
    fs.readFileSync(MAPPING_PATH, 'utf-8'),
  ) as BenchmarkMapping;

  console.log('\n[sample] Sampling contracts...');
  const sample = sampleContracts(allLabels, mapping, N, SEED);
  logSampleDistribution(sample, mapping);
  console.log(`[sample] Selected ${sample.length} contracts.\n`);

  // Cache stats from any previous run.
  const cacheStats = getCacheStats();
  if (cacheStats.files > 0) {
    console.log(
      `[cache] ${cacheStats.files} cached responses found (${cacheStats.sizeKb} KB). ` +
        `Cached calls will not incur API costs.\n`,
    );
  }

  const results: ContractBenchmarkResult[] = [];
  let totalSpent = 0;
  let budgetExceeded = false;

  for (let i = 0; i < sample.length; i++) {
    const label = sample[i];
    console.log(
      `[${String(i + 1).padStart(3)}/${sample.length}] ${label.documentName.slice(0, 60)}`,
    );

    // Load contract text.
    let contractText: string;
    try {
      contractText = loadContractText(TXT_DIR, label.documentName);
    } catch (err) {
      console.warn(`  [skip] Could not load text: ${(err as Error).message}`);
      continue;
    }

    console.log(`  chars=${contractText.length.toLocaleString()}`);

    const contractResult: ContractBenchmarkResult = {
      contractId: label.contractId,
      filename: label.documentName,
      arms: {},
    };

    let contractCost = 0;

    for (const arm of ['a', 'b', 'c'] as ArmLabel[]) {
      if (budgetExceeded) break;

      try {
        const armResult = await runArm(arm, label.contractId, contractText, totalSpent);
        contractResult.arms[arm] = armResult;
        const armCost = armResult.totalCostUsd;
        contractCost += armCost;
        totalSpent += armResult.cachedFromDisk ? 0 : armCost;

        const cached = armResult.cachedFromDisk ? ' (cached)' : '';
        console.log(
          `  arm-${arm}: cost=${fmtCost(armCost)}${cached} | ` +
            `found=${Object.values(armResult.clauseResults)
              .map((r) => (r?.found ? '1' : '0'))
              .join('')}`,
        );
      } catch (err) {
        if (err instanceof BudgetExceededError) {
          console.warn(`\n[budget] ${err.message}. Stopping.`);
          budgetExceeded = true;
          break;
        }
        console.warn(`  [error] arm-${arm}: ${(err as Error).message}`);
      }
    }

    console.log(
      `  contract cost=${fmtCost(contractCost)} | total spent=${fmtCost(totalSpent)}/${fmtCost(BUDGET_USD)}`,
    );

    results.push(contractResult);

    if (budgetExceeded) break;
  }

  console.log(`\n[score] Scoring ${results.length} contracts...`);
  const scores = scoreAllArms(results, sample, mapping);

  for (const armScore of scores) {
    console.log(`\n  ${ARM_LABELS[armScore.arm] ?? armScore.arm} (total cost: ${fmtCost(armScore.totalCostUsd)})`);
    for (const cs of armScore.perClause) {
      console.log(
        `    ${cs.clauseType.padEnd(20)} P=${pct(cs.precision).padStart(4)} ` +
          `R=${pct(cs.recall).padStart(4)} F1=${pct(cs.f1).padStart(4)} ` +
          `(TP=${cs.truePositives} FP=${cs.falsePositives} FN=${cs.falseNegatives})`,
      );
    }
  }

  console.log('\n[examples] Selecting worked examples...');
  const examples = selectWorkedExamples(results, sample, mapping);
  console.log(`[examples] Selected ${examples.length} worked examples.`);

  const reportMd = generateReport(results, scores, examples, {
    n: N,
    budgetUsd: BUDGET_USD,
    modelDate: new Date().toISOString().slice(0, 10),
    sampleSeed: SEED,
    dataPath: DATA_DIR,
  });

  writeReport(reportMd, BENCHMARK_DIR);
  writeResultsJson(results, scores, BENCHMARK_DIR);

  console.log(`\n[done] Total spend: ${fmtCost(totalSpent)} / ${fmtCost(BUDGET_USD)} budget`);
  if (budgetExceeded) {
    console.log('[done] Run was truncated by budget cap. Increase BUDGET to score more contracts.');
  }
  console.log('[done] Open benchmark/cuad/report.md to review results.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ARM_LABELS: Record<string, string> = {
  a: 'Arm A – Pactora',
  b: 'Arm B – Single LLM baseline',
  c: 'Arm C – Pactora + fallback',
};

function fmtCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function pct(v: number | null): string {
  if (v === null) return ' n/a';
  return `${(v * 100).toFixed(0)}%`;
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
