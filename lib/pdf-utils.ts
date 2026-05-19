import type { ClauseFlag } from '@/lib/clause-analysis';

export interface PDFMetadata {
  totalPages: number;
  pageBoundaries: Array<{
    pageNumber: number;
    startChar: number;
    endChar: number;
  }>;
}

/**
 * Extract page break information from raw contract text.
 * Detects common page number patterns to estimate page boundaries.
 *
 * Heuristic-based for MVP — covers most contracts (page numbers, section breaks).
 *
 * Two safeguards guard against false positives:
 *   1. Requires ≥3 sequential page markers before trusting any detected boundaries.
 *   2. Page numbers must be strictly sequential — section headers jump non-sequentially.
 * Falls back to single-page if markers are sparse or non-sequential.
 */
export function extractPDFMetadata(contractText: string): PDFMetadata {
  const singlePage: PDFMetadata = {
    totalPages: 1,
    pageBoundaries: [{ pageNumber: 1, startChar: 0, endChar: contractText.length }],
  };

  // Common patterns: "- 1 -", "Page 1 of 10", isolated numbers on their own line
  const pageNumberPattern =
    /(?:^|\n)\s*(?:[-–—]?\s*)?(\d+)(?:\s*(?:of|\/)\s*\d+)?(?:\s*[-–—]?)?\s*(?:\n|$)/gm;

  const matches = Array.from(contractText.matchAll(pageNumberPattern));

  if (matches.length < 3) {
    return singlePage;
  }

  const pageNumbers = matches.map((m) => parseInt(m[1], 10));
  const isSequential = pageNumbers.every(
    (num, i) => i === 0 || num === pageNumbers[i - 1] + 1,
  );

  if (!isSequential) {
    return singlePage;
  }

  const boundaries: PDFMetadata['pageBoundaries'] = [];
  let lastPageNumber = 0;
  let lastBoundary = 0;

  for (const match of matches) {
    const pageNum = parseInt(match[1], 10);

    if (
      pageNum > 0 &&
      pageNum <= 500 &&
      (pageNum === lastPageNumber + 1 || lastPageNumber === 0)
    ) {
      if (lastPageNumber > 0) {
        boundaries.push({
          pageNumber: lastPageNumber,
          startChar: lastBoundary,
          endChar: match.index!,
        });
      }
      lastPageNumber = pageNum;
      lastBoundary = match.index!;
    }
  }

  if (lastPageNumber > 0) {
    boundaries.push({
      pageNumber: lastPageNumber,
      startChar: lastBoundary,
      endChar: contractText.length,
    });
  }

  return {
    totalPages: lastPageNumber || 1,
    pageBoundaries: boundaries.length > 0 ? boundaries : singlePage.pageBoundaries,
  };
}

/**
 * Convert a character offset to a PDF page number (1-indexed).
 */
export function charOffsetToPageNumber(
  charOffset: number,
  pdfMetadata: PDFMetadata,
): number {
  const page = pdfMetadata.pageBoundaries.find(
    (p) => charOffset >= p.startChar && charOffset < p.endChar,
  );
  return page?.pageNumber ?? 1;
}

type FlagWithPosition = ClauseFlag & { position?: { start: number; end: number } };
type EnrichedFlag = FlagWithPosition & {
  pageNumber?: number;
  highlightRange?: { start: number; end: number };
};

/**
 * Enrich a ClauseFlag with pageNumber and highlightRange from its byte position.
 * Requires flag.position to be set (populated by hallucination-check's flagWithVerification).
 */
export function enrichFlagWithPageNumber(
  flag: FlagWithPosition,
  pdfMetadata: PDFMetadata,
): EnrichedFlag {
  if (!flag.position) return flag;

  const pageNumber = charOffsetToPageNumber(flag.position.start, pdfMetadata);

  return {
    ...flag,
    pageNumber,
    highlightRange: flag.position,
  };
}
