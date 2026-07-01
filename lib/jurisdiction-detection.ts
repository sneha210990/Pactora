// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { Jurisdiction } from './document-analysis-store';

// Maps the free-text governing-law clause extracted from a contract (e.g.
// "England and Wales", "Scots law", "Delaware") to one of Pactora's supported
// jurisdictions. Deliberately conservative: ambiguous text (bare "United
// Kingdom") or a jurisdiction Pactora doesn't cover (Delaware, New York)
// returns null so the reviewer is asked to confirm rather than being silently
// guessed for — see issue #245.
const JURISDICTION_PATTERNS: Array<{ jurisdiction: Jurisdiction; pattern: RegExp }> = [
  { jurisdiction: 'scotland', pattern: /\bscot(?:land|tish)\b|\bscots law\b/i },
  { jurisdiction: 'england_wales', pattern: /\bengland\b|\benglish law\b|\bwales\b|\bwelsh\b/i },
  { jurisdiction: 'india', pattern: /\bindia\b|\bindian\b/i },
  { jurisdiction: 'germany', pattern: /\bgermany\b|\bgerman\b/i },
  { jurisdiction: 'france', pattern: /\bfrance\b|\bfrench\b/i },
];

export function detectJurisdictionFromGoverningLaw(governingLaw: string | null | undefined): Jurisdiction | null {
  if (!governingLaw) return null;
  const match = JURISDICTION_PATTERNS.find(({ pattern }) => pattern.test(governingLaw));
  return match?.jurisdiction ?? null;
}
