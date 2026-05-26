// Stratified random sampler for CUAD contracts.
//
// Stratification strategy: bucket contracts by the number of the four CUAD-scoreable
// clause types that are present (0–4), then sample proportionally from each bucket.
// This prevents the sample from being dominated by contracts where no scoreable
// clause is present, which would inflate all arms' precision trivially.
//
// The seed is fixed so results are reproducible across runs.

import type { CuadLabel, BenchmarkMapping } from './types';
import { SCOREABLE_CLAUSE_TYPES, cuadSaysPresent } from './types';

const DEFAULT_SEED = 42;

// Seeded LCG (linear congruential generator).
// Constants from Numerical Recipes (Knuth).
function makePrng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    s = s >>> 0;
    return s / 0x100000000;
  };
}

// Fisher-Yates shuffle with a provided PRNG.
function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleContracts(
  labels: CuadLabel[],
  mapping: BenchmarkMapping,
  n = 50,
  seed = DEFAULT_SEED,
): CuadLabel[] {
  if (n >= labels.length) {
    console.warn(
      `[sample] Requested n=${n} but only ${labels.length} contracts available. Using all.`,
    );
    return [...labels];
  }

  const rng = makePrng(seed);

  // Score each contract by how many scoreable clause types are present.
  type Bucketed = { label: CuadLabel; score: number };
  const bucketed: Bucketed[] = labels.map((label) => {
    const score = SCOREABLE_CLAUSE_TYPES.filter(
      (ct) => cuadSaysPresent(ct, label, mapping) === true,
    ).length;
    return { label, score };
  });

  // Partition into buckets 0–4.
  const buckets: Bucketed[][] = [[], [], [], [], []];
  for (const b of bucketed) {
    buckets[Math.min(b.score, 4)].push(b);
  }

  // Compute proportional allocation (at least 1 per non-empty bucket).
  const nonEmpty = buckets.filter((b) => b.length > 0);
  const totalLabels = labels.length;
  let remaining = n;
  const allocations = buckets.map((bucket) => {
    if (bucket.length === 0) return 0;
    const proportion = bucket.length / totalLabels;
    return Math.max(1, Math.floor(proportion * n));
  });

  // Trim allocations to n total (greedy from highest-score bucket).
  let allocated = allocations.reduce((a, b) => a + b, 0);
  for (let i = allocations.length - 1; i >= 0 && allocated > n; i--) {
    const trim = Math.min(allocations[i] - (buckets[i].length > 0 ? 1 : 0), allocated - n);
    allocations[i] -= trim;
    allocated -= trim;
  }
  // Top up from highest-score bucket if we're short.
  for (let i = allocations.length - 1; i >= 0 && allocated < n; i--) {
    const canAdd = buckets[i].length - allocations[i];
    const add = Math.min(canAdd, n - allocated);
    allocations[i] += add;
    allocated += add;
  }

  // Sample from each bucket.
  const sampled: CuadLabel[] = [];
  for (let i = 0; i < buckets.length; i++) {
    const shuffled = shuffle(buckets[i], rng);
    sampled.push(...shuffled.slice(0, allocations[i]).map((b) => b.label));
  }

  // Final shuffle so ordering is random across buckets.
  return shuffle(sampled, rng);
}

// Log the distribution of the sample for the run log.
export function logSampleDistribution(
  sample: CuadLabel[],
  mapping: BenchmarkMapping,
): void {
  const counts: Record<string, number> = {};
  for (const ct of SCOREABLE_CLAUSE_TYPES) {
    counts[ct] = sample.filter(
      (l) => cuadSaysPresent(ct, l, mapping) === true,
    ).length;
  }
  console.log('[sample] Distribution of scoreable clause types in sample:');
  for (const [ct, count] of Object.entries(counts)) {
    const pct = ((count / sample.length) * 100).toFixed(0);
    console.log(`  ${ct.padEnd(20)} present in ${count}/${sample.length} contracts (${pct}%)`);
  }
}
