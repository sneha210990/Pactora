// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { ClauseFlag } from '@/lib/clause-analysis';

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = temp;
    }
  }
  return dp[n];
}

/**
 * Verify that extracted clause text actually exists in the source contract.
 * Uses fuzzy matching to handle minor whitespace differences.
 *
 * @param clauseText - The text Claude extracted
 * @param contractText - The original contract text
 * @param fuzzyThreshold - Similarity threshold (0-1). Default 0.95 = 95% match
 */
export function verifyClauseText(
  clauseText: string,
  contractText: string,
  fuzzyThreshold = 0.95,
): {
  verified: boolean;
  position?: { start: number; end: number };
  note?: string;
} {
  if (!clauseText || !contractText) {
    return { verified: false, note: 'Missing input text' };
  }

  // Exact match first (fastest)
  const exactMatch = contractText.indexOf(clauseText);
  if (exactMatch !== -1) {
    return {
      verified: true,
      position: { start: exactMatch, end: exactMatch + clauseText.length },
    };
  }

  // Normalize whitespace and try again
  const clauseNorm = clauseText.replace(/\s+/g, ' ').trim();
  const contractNorm = contractText.replace(/\s+/g, ' ').trim();
  const fuzzyMatch = contractNorm.indexOf(clauseNorm);
  if (fuzzyMatch !== -1) {
    return {
      verified: true,
      position: { start: fuzzyMatch, end: fuzzyMatch + clauseNorm.length },
      note: 'Matched after whitespace normalization',
    };
  }

  // Sliding window fuzzy match against the first sentence (for paraphrases).
  // Bounded to ~500 comparisons to avoid timeout on large contracts, but the
  // stride spans the FULL document rather than stopping after the first 500
  // characters — otherwise clauses quoted from later in a large contract can
  // never be fuzzy-matched and are wrongly marked unverified.
  const sentences = clauseText.split(/[.!?]+/).filter((s) => s.trim());
  let bestMatch = 0;
  let bestPosition = -1;

  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    if (firstSentence.length > 0) {
      const WINDOW_SIZE = Math.ceil(firstSentence.length * 1.2);
      const MAX_POSITIONS = 500;
      const searchSpan = Math.max(0, contractText.length - WINDOW_SIZE);
      const stride = Math.max(1, Math.ceil(searchSpan / MAX_POSITIONS));

      for (let i = 0; i <= searchSpan; i += stride) {
        const window = contractText.slice(i, i + WINDOW_SIZE);
        const dist = levenshteinDistance(firstSentence, window);
        const similarity = 1 - dist / Math.max(firstSentence.length, window.length);
        if (similarity > bestMatch) {
          bestMatch = similarity;
          bestPosition = i;
        }
      }

      if (bestMatch >= fuzzyThreshold && bestPosition !== -1) {
        let clauseEnd = bestPosition + WINDOW_SIZE;
        const boundaryMatch = contractText.slice(bestPosition).match(/[.!?]\s+/);
        if (boundaryMatch) {
          clauseEnd = bestPosition + boundaryMatch.index! + 1;
        }

        return {
          verified: true,
          position: { start: bestPosition, end: Math.min(clauseEnd, contractText.length) },
          note: `Fuzzy match (${(bestMatch * 100).toFixed(0)}% similarity)`,
        };
      }
    }
  }

  return {
    verified: false,
    note: `Not found in contract (best fuzzy match: ${(bestMatch * 100).toFixed(0)}%)`,
  };
}

/**
 * Mark a clause as unverified if text cannot be confirmed in source.
 * Returns the flag with added verified/verificationNote/position fields for audit/display.
 */
export function flagWithVerification(
  flag: ClauseFlag,
  contractText: string,
): ClauseFlag & { verified: boolean; verificationNote?: string; position?: { start: number; end: number } } {
  const check = verifyClauseText(flag.clauseText ?? '', contractText);
  return {
    ...flag,
    verified: check.verified,
    verificationNote: check.note,
    position: check.position,
  };
}
