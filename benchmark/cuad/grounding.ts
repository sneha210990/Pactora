// Grounding verification for Arm C fallback results.
//
// Confirms that a quoted text span actually exists in the source contract before
// counting it as a true positive. This prevents the fallback from inflating recall
// with hallucinated or paraphrased text.
//
// Three-tier approach:
//   1. Exact substring match (O(n))
//   2. Normalised-whitespace match (O(n))
//   3. Windowed character-overlap (window cap = 10,000 chars to prevent O(n*m) blow-up)
//
// Boilerplate-phrase filter: common legal phrases like "shall not be liable" carry
// reduced evidential weight. If the quoted text is dominated by boilerplate, a
// stricter overlap threshold is applied so the fallback cannot game the check by
// returning common language that appears in almost every contract.
//
// These techniques are conceptually inspired by grounding-verifier patterns used
// in contract-analysis tooling (see THIRD_PARTY_NOTICES.md).

// Common boilerplate phrases that appear in nearly every commercial contract.
// Quoted text consisting mainly of these phrases gets a stricter match threshold.
const BOILERPLATE_PHRASES: string[] = [
  'shall not be liable',
  'in no event shall',
  'in no event will',
  'under no circumstances',
  'to the maximum extent permitted by applicable law',
  'to the maximum extent permitted by law',
  'except as expressly set forth',
  'notwithstanding the foregoing',
  'including but not limited to',
  'without limitation',
  'sole and exclusive remedy',
  'as is',
  'without warranty of any kind',
  'indemnify, defend and hold harmless',
  'indemnify and hold harmless',
  'work made for hire',
  'all right, title and interest',
];

// Returns a weight in [0.5, 1.0] where 1.0 means "no boilerplate detected" and
// values approaching 0.5 mean the text is mostly common legal language.
function boilerplateWeight(text: string): number {
  const lower = text.toLowerCase();
  let matchedChars = 0;
  for (const phrase of BOILERPLATE_PHRASES) {
    let pos = 0;
    while (true) {
      const idx = lower.indexOf(phrase, pos);
      if (idx === -1) break;
      matchedChars += phrase.length;
      pos = idx + phrase.length;
    }
  }
  const ratio = Math.min(matchedChars / Math.max(text.length, 1), 1);
  // Map [0, 1] boilerplate ratio to weight [1.0, 0.5]
  return 1.0 - 0.5 * ratio;
}

// Character-level overlap between needle and a same-length window starting at
// position `offset` in haystack. Returns fraction of matching characters [0, 1].
function windowOverlap(
  needle: string,
  haystack: string,
  offset: number,
): number {
  const n = needle.length;
  let matches = 0;
  for (let i = 0; i < n; i++) {
    if (needle[i] === haystack[offset + i]) matches++;
  }
  return matches / n;
}

// Search haystack for the best character-overlap match for needle.
// Caps the search by only examining positions that are multiples of `stride`
// (sparse scan) plus a dense scan in any promising region found.
function bestWindowedOverlap(
  needle: string,
  haystack: string,
  maxWindow = 10_000,
): number {
  if (haystack.length < needle.length) return 0;

  let bestOverall = 0;

  // Split haystack into non-overlapping windows of maxWindow, each with a small
  // lead-in from the previous window to avoid missing cross-boundary matches.
  const leadIn = needle.length - 1;
  for (
    let winStart = 0;
    winStart < haystack.length;
    winStart += maxWindow
  ) {
    const start = Math.max(0, winStart - leadIn);
    const end = Math.min(haystack.length, winStart + maxWindow);
    const window = haystack.slice(start, end);

    // Sparse scan across the window (stride = 4) for speed.
    const stride = 4;
    let bestInWindow = 0;
    let bestPos = -1;

    const limit = window.length - needle.length;
    for (let i = 0; i <= limit; i += stride) {
      const overlap = windowOverlap(needle, window, i);
      if (overlap > bestInWindow) {
        bestInWindow = overlap;
        bestPos = i;
      }
      if (bestInWindow >= 0.98) break;
    }

    // Dense scan around the best sparse position.
    if (bestPos !== -1) {
      const denseStart = Math.max(0, bestPos - stride);
      const denseEnd = Math.min(limit, bestPos + stride);
      for (let i = denseStart; i <= denseEnd; i++) {
        const overlap = windowOverlap(needle, window, i);
        if (overlap > bestInWindow) bestInWindow = overlap;
      }
    }

    if (bestInWindow > bestOverall) bestOverall = bestInWindow;
    if (bestOverall >= 0.98) break;
  }

  return bestOverall;
}

export type GroundingResult = {
  grounded: boolean;
  method: 'exact' | 'normalised' | 'windowed' | 'none';
  overlap?: number;
  weight?: number;
};

// Minimum acceptable overlap fraction for the windowed fallback.
const BASE_OVERLAP_THRESHOLD = 0.85;

export function checkGrounding(
  quotedText: string,
  contractText: string,
): GroundingResult {
  if (!quotedText || quotedText.trim().length < 10) {
    return { grounded: false, method: 'none' };
  }

  const q = quotedText.trim();

  // Tier 1: exact substring match.
  if (contractText.includes(q)) {
    return { grounded: true, method: 'exact' };
  }

  // Tier 2: normalised whitespace match.
  const qNorm = q.replace(/\s+/g, ' ');
  const cNorm = contractText.replace(/\s+/g, ' ');
  if (cNorm.includes(qNorm)) {
    return { grounded: true, method: 'normalised' };
  }

  // Tier 3: windowed character overlap.
  const weight = boilerplateWeight(q);
  // Stricter threshold for boilerplate-heavy quotes (could match anything).
  const threshold = weight >= 0.8 ? BASE_OVERLAP_THRESHOLD : BASE_OVERLAP_THRESHOLD + 0.1;

  const overlap = bestWindowedOverlap(qNorm, cNorm);

  if (overlap >= threshold) {
    return { grounded: true, method: 'windowed', overlap, weight };
  }

  return { grounded: false, method: 'none', overlap, weight };
}
