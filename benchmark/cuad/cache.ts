// Disk-based LLM response cache for the benchmark.
//
// Cache files are stored as JSON in benchmark/cuad/.cache/.
// Key: {contractId}__{arm}__{clauseType}
// This makes reruns free after the initial run.

import * as fs from 'fs';
import * as path from 'path';
import type { ArmClauseResult, ArmLabel, BenchmarkClauseType } from './types';

const CACHE_DIR = path.join(__dirname, '.cache');

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cacheKey(
  contractId: string,
  arm: ArmLabel,
  clauseType: BenchmarkClauseType,
): string {
  // Sanitise clauseType for use in a filename.
  const safeClause = clauseType.replace(/[^a-zA-Z0-9]/g, '_');
  return `${contractId}__arm_${arm}__${safeClause}`;
}

function cachePath(key: string): string {
  return path.join(CACHE_DIR, `${key}.json`);
}

export function readCache(
  contractId: string,
  arm: ArmLabel,
  clauseType: BenchmarkClauseType,
): ArmClauseResult | null {
  ensureCacheDir();
  const file = cachePath(cacheKey(contractId, arm, clauseType));
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw) as ArmClauseResult;
  } catch {
    return null;
  }
}

export function writeCache(
  contractId: string,
  arm: ArmLabel,
  clauseType: BenchmarkClauseType,
  result: ArmClauseResult,
): void {
  ensureCacheDir();
  const file = cachePath(cacheKey(contractId, arm, clauseType));
  fs.writeFileSync(file, JSON.stringify(result, null, 2), 'utf-8');
}

// Cache an entire arm's results for one contract at once.
export function readArmCache(
  contractId: string,
  arm: ArmLabel,
  clauseTypes: BenchmarkClauseType[],
): Partial<Record<BenchmarkClauseType, ArmClauseResult>> | null {
  const result: Partial<Record<BenchmarkClauseType, ArmClauseResult>> = {};
  let allHit = true;
  for (const ct of clauseTypes) {
    const cached = readCache(contractId, arm, ct);
    if (cached === null) {
      allHit = false;
      break;
    }
    result[ct] = cached;
  }
  return allHit ? result : null;
}

export function writeArmCache(
  contractId: string,
  arm: ArmLabel,
  clauseResults: Partial<Record<BenchmarkClauseType, ArmClauseResult>>,
): void {
  for (const [ct, result] of Object.entries(clauseResults) as [
    BenchmarkClauseType,
    ArmClauseResult,
  ][]) {
    writeCache(contractId, arm, ct, result);
  }
}

export function getCacheStats(): { files: number; sizeKb: number } {
  ensureCacheDir();
  const files = fs.readdirSync(CACHE_DIR).filter((f) => f.endsWith('.json'));
  let totalBytes = 0;
  for (const f of files) {
    try {
      totalBytes += fs.statSync(path.join(CACHE_DIR, f)).size;
    } catch {
      // ignore
    }
  }
  return { files: files.length, sizeKb: Math.round(totalBytes / 1024) };
}
