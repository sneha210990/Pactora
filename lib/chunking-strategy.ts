import type { ClauseFlag } from '@/lib/clause-analysis';

export interface ContractChunk {
  chunkIndex: number;
  text: string;
  startChar: number;
  endChar: number;
}

const CHUNK_SIZE = 120_000;
const OVERLAP_SIZE = 5_000;

/**
 * Split a large contract into overlapping chunks so every clause is analyzed.
 *
 * Contracts ≤ 100k chars: returned as a single chunk.
 * Contracts > 100k chars: split into 100k chunks with 5k overlap so clauses
 * that straddle a boundary appear in both adjacent chunks.
 *
 * Chunk boundaries are nudged to the nearest sentence end (period + space) or
 * double newline within the last 20% of the intended chunk to avoid cutting a
 * clause mid-sentence.
 */
export function createOverlappingChunks(contractText: string): ContractChunk[] {
  if (contractText.length <= CHUNK_SIZE) {
    return [{ chunkIndex: 0, text: contractText, startChar: 0, endChar: contractText.length }];
  }

  const chunks: ContractChunk[] = [];
  let position = 0;
  let chunkIndex = 0;

  while (position < contractText.length) {
    const chunkStart = Math.max(0, position - (chunkIndex > 0 ? OVERLAP_SIZE : 0));
    let chunkEnd = Math.min(contractText.length, position + CHUNK_SIZE);

    if (chunkEnd < contractText.length) {
      const searchWindowStart = Math.max(chunkStart, chunkEnd - Math.floor(CHUNK_SIZE * 0.2));

      const nearbyPeriod = contractText.lastIndexOf('.', chunkEnd);
      if (nearbyPeriod > searchWindowStart && nearbyPeriod < chunkEnd) {
        chunkEnd = nearbyPeriod + 1;
      } else {
        const doubleNewline = contractText.lastIndexOf('\n\n', chunkEnd);
        if (doubleNewline > searchWindowStart && doubleNewline < chunkEnd) {
          chunkEnd = doubleNewline + 1;
        }
      }
    }

    chunks.push({ chunkIndex, text: contractText.slice(chunkStart, chunkEnd), startChar: chunkStart, endChar: chunkEnd });
    position = chunkEnd;
    chunkIndex++;
  }

  return chunks;
}

/**
 * Merge clause flags from multiple chunks, deduplicating overlaps.
 *
 * Two flags are considered duplicates when they share the same clauseType and
 * the first 100 chars of problematicLanguage are identical — the signature of a
 * clause found in both sides of an overlapping boundary.  If one occurrence is
 * verified and the other is not, the verified one wins; otherwise the earlier
 * chunk's occurrence is kept.
 */
export function mergeChunkResults(
  results: Array<{
    chunkIndex: number;
    clauseType: string;
    flag: ClauseFlag | null;
  }>,
): ClauseFlag[] {
  const seen = new Map<string, { chunkIndex: number; flag: ClauseFlag }>();

  for (const result of results) {
    if (!result.flag) continue;

    const key = `${result.clauseType}::${result.flag.problematicLanguage.slice(0, 100)}`;

    if (!seen.has(key)) {
      seen.set(key, { chunkIndex: result.chunkIndex, flag: result.flag });
    } else {
      const existing = seen.get(key)!;
      // Prefer verified over unverified when deduplicating overlaps.
      const newIsVerified = (result.flag as Record<string, unknown>).verified === true;
      const oldIsVerified = (existing.flag as Record<string, unknown>).verified === true;
      if (newIsVerified && !oldIsVerified) {
        seen.set(key, { chunkIndex: result.chunkIndex, flag: result.flag });
      }
    }
  }

  return Array.from(seen.values()).map((v) => v.flag);
}
