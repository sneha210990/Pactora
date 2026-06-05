// Common legal acronyms that should NOT be replaced by [PARTY].
const LEGAL_ACRONYMS = new Set([
  'IP', 'UK', 'EU', 'US', 'USA', 'VAT', 'GDPR', 'NDA', 'SOW',
  'MSA', 'SLA', 'API', 'KPI', 'CEO', 'CFO', 'CTO', 'DPA', 'PII',
  'SaaS', 'ACV', 'ARR', 'MRR', 'FRAND', 'IPO', 'HR', 'IT', 'SaaS',
]);

/**
 * Strips identifying information from a clause excerpt before storing
 * it as an anonymised pattern in the clause library.
 *
 * Replaces: monetary amounts, dates, company/party names.
 * Preserves: clause structure, obligation language, risk indicators.
 */
export function anonymiseClauseText(text: string): string {
  return text
    // Monetary amounts with currency symbol: £5m, $500,000, €1,000
    .replace(
      /(?:£|\$|€|USD|GBP|EUR)\s*[\d,]+(?:\.\d+)?(?:\s*(?:m|k|bn|million|thousand|billion))?/gi,
      '[AMOUNT]',
    )
    // Percentages and multiples: 10%, 0.5x ACV, 2× ARR
    .replace(/\b\d+(?:\.\d+)?\s*(?:per\s*cent|percent|%)/gi, '[AMOUNT]')
    .replace(/\b\d+(?:\.\d+)?(?:x|×)\s*(?:ACV|ARR|MRR|fees?|revenue)/gi, '[AMOUNT]')
    // Plain large numbers that are clearly amounts (e.g. "500,000" or "1,000,000")
    .replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, '[AMOUNT]')
    // Dates: "1 January 2024", "January 1, 2024", "01/01/2024", "2024-01-01"
    .replace(
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
      '[DATE]',
    )
    .replace(
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
      '[DATE]',
    )
    .replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[DATE]')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]')
    // Company/entity names: words preceding legal suffixes
    .replace(
      /\b[A-Z][A-Za-z0-9\s&,.'()-]{1,60}(?:Ltd(?:\.)?|Limited|Inc(?:\.)?|Incorporated|LLC|LLP|Plc|Corp(?:\.)?|Corporation|GmbH|B\.?V\.?|AG)\b/g,
      '[PARTY]',
    )
    // ALL-CAPS sequences that look like defined party names (THE CUSTOMER, THE SUPPLIER, ACME)
    // but skip known legal acronyms
    .replace(/\b([A-Z]{2,}(?:\s+[A-Z]{2,}){0,2})\b/g, (match) =>
      LEGAL_ACRONYMS.has(match.trim()) ? match : '[PARTY]',
    )
    .trim();
}
