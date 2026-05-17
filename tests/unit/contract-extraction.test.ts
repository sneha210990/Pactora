import { describe, it, expect } from 'vitest';
import { detectContractValues, extractContractText } from '../../lib/contract-extraction';

// ---------------------------------------------------------------------------
// detectContractValues — pure function, no external dependencies
// ---------------------------------------------------------------------------

describe('detectContractValues', () => {
  // -------------------------------------------------------------------------
  // Money parsing (exercised via ACV detection)
  // -------------------------------------------------------------------------
  describe('money parsing', () => {
    it('parses £75,000', () => {
      expect(detectContractValues('Annual fee: £75,000').acv.value).toBe(75000);
    });

    it('parses $90K (uppercase K suffix)', () => {
      expect(detectContractValues('Annual fee: $90K').acv.value).toBe(90000);
    });

    it('parses £75k (lowercase k suffix)', () => {
      expect(detectContractValues('Annual fee: £75k').acv.value).toBe(75000);
    });

    it('parses €50,000', () => {
      expect(detectContractValues('Annual subscription fee: €50,000').acv.value).toBe(50000);
    });

    it('parses £75,000.00 with decimals', () => {
      expect(detectContractValues('Annual fee: £75,000.00').acv.value).toBe(75000);
    });

    it('parses GBP 75,000 (ISO code with space)', () => {
      expect(detectContractValues('Annual fee: GBP 75,000').acv.value).toBe(75000);
    });

    it('parses USD 90,000', () => {
      expect(detectContractValues('Annual fee: USD 90,000').acv.value).toBe(90000);
    });

    it('parses EUR 50,000', () => {
      expect(detectContractValues('Annual fee: EUR 50,000').acv.value).toBe(50000);
    });
  });

  // -------------------------------------------------------------------------
  // ACV keyword detection
  // -------------------------------------------------------------------------
  describe('ACV detection', () => {
    it('returns confidence 0.82 when amount appears after keyword', () => {
      const result = detectContractValues('Annual contract value: £75,000');
      expect(result.acv.value).toBe(75000);
      expect(result.acv.confidence).toBe(0.82);
      expect(result.acv.extractionMethod).toBe('regex');
    });

    it('returns lower confidence 0.72 when amount appears before keyword on same line', () => {
      const result = detectContractValues('£50,000 annual fee applies');
      expect(result.acv.value).toBe(50000);
      expect(result.acv.confidence).toBe(0.72);
    });

    it('sets extractionMethod to "regex"', () => {
      expect(detectContractValues('Annual fee: £100,000').acv.extractionMethod).toBe('regex');
    });

    it('captures the matching line as evidence', () => {
      const result = detectContractValues('Annual fee: £100,000');
      expect(result.acv.evidence).toContain('Annual fee');
    });

    it('returns null acv when no ACV keyword found', () => {
      const result = detectContractValues('This contract has no pricing information.');
      expect(result.acv.value).toBeNull();
      expect(result.acv.confidence).toBeNull();
      expect(result.acv.evidence).toBeNull();
      expect(result.acv.extractionMethod).toBeNull();
    });

    it('returns null acv when keyword found but no money amount on line', () => {
      const result = detectContractValues('Annual fee: to be agreed between the parties');
      expect(result.acv.value).toBeNull();
    });

    it('returns the first matching line when multiple lines contain keywords', () => {
      const text = 'Annual fee: £100,000\nAnnual fee: £200,000';
      expect(detectContractValues(text).acv.value).toBe(100000);
    });

    it('is case-insensitive for keyword matching', () => {
      expect(detectContractValues('ANNUAL FEE: £75,000').acv.value).toBe(75000);
    });

    it('matches "acv" keyword', () => {
      expect(detectContractValues('ACV: $120,000').acv.value).toBe(120000);
    });

    it('matches "annual recurring revenue"', () => {
      expect(detectContractValues('Annual Recurring Revenue: $500,000').acv.value).toBe(500000);
    });

    it('matches "arr"', () => {
      expect(detectContractValues('ARR: £240,000').acv.value).toBe(240000);
    });

    it('matches "subscription fee"', () => {
      expect(detectContractValues('Subscription Fee: £24,000').acv.value).toBe(24000);
    });

    it('matches "license fee"', () => {
      expect(detectContractValues('License fee: $36,000').acv.value).toBe(36000);
    });

    it('matches "licence fee" (British spelling)', () => {
      expect(detectContractValues('Licence fee: £36,000').acv.value).toBe(36000);
    });

    it('matches "total contract value"', () => {
      expect(detectContractValues('Total contract value: £250,000').acv.value).toBe(250000);
    });

    it('matches "platform fee"', () => {
      expect(detectContractValues('Platform fee: £60,000').acv.value).toBe(60000);
    });

    it('matches "saas fee"', () => {
      expect(detectContractValues('SaaS fee: $48,000').acv.value).toBe(48000);
    });

    it('matches "service fees"', () => {
      expect(detectContractValues('Service fees: £30,000').acv.value).toBe(30000);
    });
  });

  // -------------------------------------------------------------------------
  // Monthly fee fallback — amount is annualised (* 12)
  // -------------------------------------------------------------------------
  describe('monthly fee fallback', () => {
    it('annualises "monthly fee" when no ACV keyword matches', () => {
      const result = detectContractValues('Monthly fee: £5,000');
      expect(result.acv.value).toBe(60000); // 5,000 × 12
    });

    it('annualises "monthly subscription"', () => {
      expect(detectContractValues('Monthly subscription: £1,000').acv.value).toBe(12000);
    });

    it('annualises "monthly charge"', () => {
      expect(detectContractValues('Monthly charge: $2,500').acv.value).toBe(30000);
    });

    it('uses ACV keyword result instead of monthly when both are present', () => {
      const text = 'Monthly fee: £2,000\nAnnual fee: £36,000';
      // Annual fee should win; monthly fallback is not used
      expect(detectContractValues(text).acv.value).toBe(36000);
    });

    it('returns null when neither ACV nor monthly keywords match', () => {
      expect(detectContractValues('No pricing information here.').acv.value).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Contract term detection
  // -------------------------------------------------------------------------
  describe('term detection', () => {
    it('detects "12 months"', () => {
      expect(detectContractValues('Initial term: 12 months').termMonths.value).toBe(12);
    });

    it('detects "1 month" (singular)', () => {
      expect(detectContractValues('Pilot period: 1 month').termMonths.value).toBe(1);
    });

    it('detects "36 months"', () => {
      expect(detectContractValues('Term: 36 months').termMonths.value).toBe(36);
    });

    it('detects "6 mos" abbreviation', () => {
      expect(detectContractValues('Term: 6 mos').termMonths.value).toBe(6);
    });

    it('detects "6 mo" abbreviation', () => {
      expect(detectContractValues('Term: 6 mo').termMonths.value).toBe(6);
    });

    it('detects "1 year" and converts to 12 months', () => {
      expect(detectContractValues('Term: 1 year').termMonths.value).toBe(12);
    });

    it('detects "2 years" and converts to 24 months', () => {
      expect(detectContractValues('Term: 2 years').termMonths.value).toBe(24);
    });

    it('detects "3 yrs" abbreviation and converts to 36 months', () => {
      expect(detectContractValues('Term: 3 yrs').termMonths.value).toBe(36);
    });

    it('prefers month match over year match when both appear', () => {
      // MONTH_TERM_REGEX is checked first; "24 month" wins over "2 year"
      expect(detectContractValues('This is a 24 month (2 year) agreement').termMonths.value).toBe(24);
    });

    it('captures evidence string', () => {
      const result = detectContractValues('Term: 12 months');
      expect(result.termMonths.evidence).toMatch(/12\s*months?/i);
    });

    it('returns null when no term found', () => {
      const result = detectContractValues('No term information here.');
      expect(result.termMonths.value).toBeNull();
      expect(result.termMonths.confidence).toBeNull();
      expect(result.termMonths.evidence).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Insurance cover detection
  // -------------------------------------------------------------------------
  describe('insurance detection', () => {
    it('detects insurance coverage amount', () => {
      expect(
        detectContractValues('maintain insurance coverage of £1,000,000').insuranceCover.value,
      ).toBe(1000000);
    });

    it('detects "insurance cover" keyword', () => {
      expect(detectContractValues('insurance cover: $5,000,000').insuranceCover.value).toBe(
        5000000,
      );
    });

    it('detects "insurance" keyword alone', () => {
      expect(
        detectContractValues('insurance of at least £2,000,000 per occurrence').insuranceCover
          .value,
      ).toBe(2000000);
    });

    it('returns null when no insurance keyword found', () => {
      const result = detectContractValues('No insurance requirements in this contract.');
      expect(result.insuranceCover.value).toBeNull();
    });

    it('returns null when insurance keyword found but no amount', () => {
      expect(
        detectContractValues('Insurance requirements apply per applicable law.').insuranceCover
          .value,
      ).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Data type detection
  // -------------------------------------------------------------------------
  describe('data type detection', () => {
    it('detects "special category data" as sensitive', () => {
      expect(
        detectContractValues('involving special category data under GDPR').dataType.value,
      ).toBe('sensitive');
    });

    it('detects "sensitive personal data" as sensitive', () => {
      expect(
        detectContractValues('processor handles sensitive personal data').dataType.value,
      ).toBe('sensitive');
    });

    it('detects "personal data" as personal', () => {
      expect(
        detectContractValues('processing of personal data under GDPR').dataType.value,
      ).toBe('personal');
    });

    it('detects "standard data" as standard', () => {
      expect(detectContractValues('involves standard data only').dataType.value).toBe('standard');
    });

    it('sensitive beats personal when text contains both', () => {
      // "personal data" appears first but "special category data" should win
      expect(
        detectContractValues('personal data including special category data').dataType.value,
      ).toBe('sensitive');
    });

    it('sensitive beats personal when "sensitive personal data" overlaps with "personal data"', () => {
      expect(
        detectContractValues('processor handles sensitive personal data').dataType.value,
      ).toBe('sensitive');
    });

    it('is case-insensitive', () => {
      expect(detectContractValues('PERSONAL DATA processing').dataType.value).toBe('personal');
    });

    it('returns null when no data type phrase found', () => {
      const result = detectContractValues('General terms and conditions apply.');
      expect(result.dataType.value).toBeNull();
      expect(result.dataType.confidence).toBeNull();
      expect(result.dataType.evidence).toBeNull();
      expect(result.dataType.extractionMethod).toBeNull();
    });

    it('captures evidence string for sensitive data', () => {
      const result = detectContractValues('involving special category data');
      expect(result.dataType.evidence).toContain('special category data');
    });

    it('captures evidence string for personal data', () => {
      const result = detectContractValues('processes personal data on behalf');
      expect(result.dataType.evidence).toContain('personal data');
    });
  });

  // -------------------------------------------------------------------------
  // Realistic multi-field contracts
  // -------------------------------------------------------------------------
  describe('realistic contract snippets', () => {
    it('extracts all four fields from a SaaS contract excerpt', () => {
      const text = [
        'SOFTWARE AS A SERVICE AGREEMENT',
        'Annual Contract Value: £120,000',
        'Initial Term: 24 months',
        'The Vendor shall maintain insurance coverage of £2,000,000.',
        'The Vendor will process personal data on behalf of the Customer.',
      ].join('\n');

      const result = detectContractValues(text);
      expect(result.acv.value).toBe(120000);
      expect(result.termMonths.value).toBe(24);
      expect(result.insuranceCover.value).toBe(2000000);
      expect(result.dataType.value).toBe('personal');
    });

    it('annualises monthly fee in a realistic snippet', () => {
      const text = [
        'MANAGED SERVICES AGREEMENT',
        'Monthly subscription: £3,500',
        'Term: 12 months',
        'Insurance: £1,000,000',
        'This agreement involves standard data.',
      ].join('\n');

      const result = detectContractValues(text);
      expect(result.acv.value).toBe(42000); // 3,500 × 12
      expect(result.termMonths.value).toBe(12);
      expect(result.insuranceCover.value).toBe(1000000);
      expect(result.dataType.value).toBe('standard');
    });

    it('returns all nulls for an empty string', () => {
      const result = detectContractValues('');
      expect(result.acv.value).toBeNull();
      expect(result.termMonths.value).toBeNull();
      expect(result.insuranceCover.value).toBeNull();
      expect(result.dataType.value).toBeNull();
    });

    it('returns all nulls for whitespace-only input', () => {
      const result = detectContractValues('   \n\t\n   ');
      expect(result.acv.value).toBeNull();
      expect(result.termMonths.value).toBeNull();
      expect(result.insuranceCover.value).toBeNull();
      expect(result.dataType.value).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// extractContractText — file-type routing and .doc parsing
//
// PDF and DOCX paths require dynamic loading of pdf-parse / mammoth and are
// covered by the Playwright E2E suite using real fixture files. The tests
// below cover the synchronous code paths that need no external mocks.
// ---------------------------------------------------------------------------

describe('extractContractText', () => {
  describe('file type detection', () => {
    it('throws for an unsupported extension', async () => {
      await expect(
        extractContractText('contract.xyz', Buffer.from('some content')),
      ).rejects.toThrow('Unsupported file type');
    });

    it('throws for a .txt extension', async () => {
      await expect(
        extractContractText('agreement.txt', Buffer.from('some content')),
      ).rejects.toThrow('Unsupported file type');
    });

    it('throws for a file with no extension', async () => {
      await expect(
        extractContractText('contractfile', Buffer.from('some content')),
      ).rejects.toThrow('Unsupported file type');
    });

    it('uses DOC MIME type when extension is unrecognised', async () => {
      // Unknown .bin extension: MIME type 'application/msword' routes it to legacy DOC parsing
      const buffer = Buffer.from(
        'This is a legacy document with adequate length for testing purposes',
      );
      const result = await extractContractText('contract.bin', buffer, 'application/msword');
      expect(result.length).toBeGreaterThan(0);
    });

    it('is case-insensitive for extension matching', async () => {
      const buffer = Buffer.from(
        'This is a contract document with sufficient length for testing',
      );
      const result = await extractContractText('CONTRACT.DOC', buffer);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('legacy .doc parsing', () => {
    it('extracts readable ASCII text from a plain-text buffer', async () => {
      const buffer = Buffer.from(
        'Annual fee payable: £75,000 per annum. Term: 12 months.',
        'ascii',
      );
      const result = await extractContractText('contract.doc', buffer);
      expect(result).toContain('Annual fee payable');
    });

    it('strips null bytes from binary content', async () => {
      const buffer = Buffer.concat([
        Buffer.from('Valid contract text that is quite long enough', 'ascii'),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from('More readable text here', 'ascii'),
      ]);
      const result = await extractContractText('contract.doc', buffer);
      expect(result).not.toContain('\x00');
    });

    it('normalises CRLF line endings to LF', async () => {
      const buffer = Buffer.from(
        'Line one here\r\nLine two here\r\nThird contract line here with more text',
      );
      const result = await extractContractText('contract.doc', buffer);
      expect(result).not.toContain('\r');
    });

    it('throws when extracted text is shorter than 20 characters', async () => {
      // Non-printable bytes produce no readable sequences
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]);
      await expect(extractContractText('contract.doc', buffer)).rejects.toThrow(
        'No readable text was found',
      );
    });

    it('throws when the buffer is empty', async () => {
      await expect(extractContractText('contract.doc', Buffer.alloc(0))).rejects.toThrow(
        'No readable text was found',
      );
    });

    it('returns text usable by detectContractValues after extraction', async () => {
      const contractText =
        'Annual fee: £48,000. Term: 12 months. Insurance coverage: £1,000,000.';
      const buffer = Buffer.from(contractText, 'ascii');
      const extracted = await extractContractText('contract.doc', buffer);
      const values = detectContractValues(extracted);
      expect(values.acv.value).toBe(48000);
      expect(values.termMonths.value).toBe(12);
      expect(values.insuranceCover.value).toBe(1000000);
    });
  });
});
