import { describe, it, expect } from 'vitest';
import {
  normalizeWhitespace,
  normalizeTerm,
  normalizeStructuralTarget,
  stableId,
  excerptAt,
  lineForIndex,
  isLikelyDefinedTerm,
  isCommonLegalRoleTerm,
  rankUndefinedTermSeverity,
} from '../../lib/integrity-engine/normalization';
import { extractDefinitions } from '../../lib/integrity-engine/definition-extractor';
import { extractReferences, buildStructuralTargets } from '../../lib/integrity-engine/reference-graph';
import { parseContract } from '../../lib/integrity-engine/parser';
import { buildIntegrityContext, runIntegrityEngine } from '../../lib/integrity-engine/engine';
import { brokenReferencesValidator } from '../../lib/integrity-engine/validators/brokenReferences';
import { deadDefinitionsValidator } from '../../lib/integrity-engine/validators/deadDefinitions';
import { duplicateDefinitionsValidator } from '../../lib/integrity-engine/validators/duplicateDefinitions';
import { inconsistentCapitalizationValidator } from '../../lib/integrity-engine/validators/inconsistentCapitalization';
import { undefinedTermsValidator } from '../../lib/integrity-engine/validators/undefinedTerms';
import type { ContractSection } from '../../lib/integrity-engine/types';

// Minimal sections stub for low-level extraction tests that don't need section context
const NO_SECTIONS: ContractSection[] = [];

// ---------------------------------------------------------------------------
// normalization.ts
// ---------------------------------------------------------------------------

describe('normalizeWhitespace', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
  });

  it('collapses internal multiple spaces to one', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
  });

  it('collapses tabs and newlines', () => {
    expect(normalizeWhitespace('hello\t\nworld')).toBe('hello world');
  });

  it('leaves already-normalised strings unchanged', () => {
    expect(normalizeWhitespace('hello world')).toBe('hello world');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeWhitespace('   \t  ')).toBe('');
  });
});

describe('normalizeTerm', () => {
  it('lowercases the term', () => {
    expect(normalizeTerm('Software')).toBe('software');
  });

  it('strips straight double quotes', () => {
    expect(normalizeTerm('"Confidential Information"')).toBe('confidential information');
  });

  it('strips left curly double quotes', () => {
    expect(normalizeTerm('“Force Majeure”')).toBe('force majeure');
  });

  it('strips trailing comma', () => {
    expect(normalizeTerm('Agreement,')).toBe('agreement');
  });

  it('strips trailing semicolon', () => {
    expect(normalizeTerm('Term;')).toBe('term');
  });

  it('strips trailing colon', () => {
    expect(normalizeTerm('Services:')).toBe('services');
  });

  it('normalises internal whitespace before lowercasing', () => {
    expect(normalizeTerm('  Personal   Data  ')).toBe('personal data');
  });

  it('replaces curly single quotes with straight', () => {
    expect(normalizeTerm("‘Licensor’")).toBe('licensor');
  });
});

describe('normalizeStructuralTarget', () => {
  it('produces "kind:label" in lowercase', () => {
    expect(normalizeStructuralTarget('section', '5.1')).toBe('section:5.1');
  });

  it('lowercases kind', () => {
    expect(normalizeStructuralTarget('Schedule', 'A')).toBe('schedule:a');
  });

  it('lowercases label', () => {
    expect(normalizeStructuralTarget('annex', 'B')).toBe('annex:b');
  });

  it('handles document kind', () => {
    expect(normalizeStructuralTarget('document', 'msa')).toBe('document:msa');
  });

  it('collapses label whitespace', () => {
    expect(normalizeStructuralTarget('section', '  5.1  ')).toBe('section:5.1');
  });
});

describe('stableId', () => {
  it('joins parts with hyphens and lowercases', () => {
    expect(stableId('contract', 'Test Contract', 0)).toBe('contract-test-contract-0');
  });

  it('filters out undefined parts', () => {
    expect(stableId(undefined, 'section', 'body')).toBe('section-body');
  });

  it('filters out empty string parts', () => {
    expect(stableId('contract', '', 0)).toBe('contract-0');
  });

  it('replaces non-alphanumeric characters with hyphens', () => {
    expect(stableId('a/b', 'c:d')).toBe('a-b-c-d');
  });

  it('strips leading and trailing hyphens from result', () => {
    expect(stableId('/leading', 'trailing/')).toBe('leading-trailing');
  });

  it('truncates at 96 characters', () => {
    const result = stableId('a'.repeat(200));
    expect(result.length).toBe(96);
  });
});

describe('excerptAt', () => {
  it('returns the full text when it is short', () => {
    expect(excerptAt('hello world', 6, 5)).toBe('hello world');
  });

  it('adds leading ellipsis when the window starts after the beginning', () => {
    const text = 'a'.repeat(200);
    const result = excerptAt(text, 100, 5);
    expect(result.startsWith('…')).toBe(true);
  });

  it('adds trailing ellipsis when the window ends before the end', () => {
    const text = 'a'.repeat(200);
    const result = excerptAt(text, 100, 5);
    expect(result.endsWith('…')).toBe(true);
  });

  it('does not add leading ellipsis when starting at position 0', () => {
    const text = 'a'.repeat(200);
    const result = excerptAt(text, 0, 5);
    expect(result.startsWith('…')).toBe(false);
  });

  it('does not add trailing ellipsis when the window reaches the end', () => {
    const text = 'a'.repeat(200);
    const result = excerptAt(text, 195, 5);
    expect(result.endsWith('…')).toBe(false);
  });
});

describe('lineForIndex', () => {
  const text = 'line1\nline2\nline3';

  it('returns 1 for index 0', () => {
    expect(lineForIndex(text, 0)).toBe(1);
  });

  it('returns 2 for an index on the second line', () => {
    expect(lineForIndex(text, 6)).toBe(2);
  });

  it('returns 3 for an index on the third line', () => {
    expect(lineForIndex(text, 12)).toBe(3);
  });

  it('returns 1 for a single-line text', () => {
    expect(lineForIndex('single line', 5)).toBe(1);
  });
});

describe('isLikelyDefinedTerm', () => {
  it('accepts a single capitalized word', () => {
    expect(isLikelyDefinedTerm('Software')).toBe(true);
  });

  it('accepts a two-word capitalized phrase', () => {
    expect(isLikelyDefinedTerm('Confidential Information')).toBe(true);
  });

  it('accepts an all-caps acronym', () => {
    expect(isLikelyDefinedTerm('GDPR')).toBe(true);
  });

  it('accepts an acronym mixed with title-case word', () => {
    expect(isLikelyDefinedTerm('IP Rights')).toBe(true);
  });

  it('rejects a term in the STOP_WORDS list', () => {
    expect(isLikelyDefinedTerm('Agreement')).toBe(false);
  });

  it('rejects "Party" (stop word)', () => {
    expect(isLikelyDefinedTerm('Party')).toBe(false);
  });

  it('rejects a term starting with "The"', () => {
    expect(isLikelyDefinedTerm('The Agreement')).toBe(false);
  });

  it('rejects a term starting with "Any"', () => {
    expect(isLikelyDefinedTerm('Any Loss')).toBe(false);
  });

  it('rejects a term starting with "Each"', () => {
    expect(isLikelyDefinedTerm('Each Party')).toBe(false);
  });

  it('rejects a fully lowercase term', () => {
    expect(isLikelyDefinedTerm('confidential information')).toBe(false);
  });

  it('rejects a term shorter than 3 characters', () => {
    expect(isLikelyDefinedTerm('IP')).toBe(false);
  });

  it('rejects a phrase with more than 5 words', () => {
    expect(isLikelyDefinedTerm('Service Level Agreement Metrics Performance Report')).toBe(false);
  });

  it('accepts exactly 5 words', () => {
    expect(isLikelyDefinedTerm('Service Level Agreement Metrics Report')).toBe(true);
  });

  it('rejects a word starting with a lowercase letter in the middle of a phrase', () => {
    expect(isLikelyDefinedTerm('Personal data Protection')).toBe(false);
  });
});

describe('isCommonLegalRoleTerm', () => {
  it('accepts "Customer"', () => {
    expect(isCommonLegalRoleTerm('Customer')).toBe(true);
  });

  it('accepts "Supplier"', () => {
    expect(isCommonLegalRoleTerm('Supplier')).toBe(true);
  });

  it('accepts "Vendor"', () => {
    expect(isCommonLegalRoleTerm('Vendor')).toBe(true);
  });

  it('accepts "Processor"', () => {
    expect(isCommonLegalRoleTerm('Processor')).toBe(true);
  });

  it('rejects a non-role term', () => {
    expect(isCommonLegalRoleTerm('Software')).toBe(false);
  });

  it('is case-sensitive (lowercase "customer" is not a role term)', () => {
    expect(isCommonLegalRoleTerm('customer')).toBe(false);
  });
});

describe('rankUndefinedTermSeverity', () => {
  it('returns "high" for 5+ usages of a non-role term', () => {
    expect(rankUndefinedTermSeverity(5, false)).toBe('high');
  });

  it('returns "medium" for 5+ usages of a role term (role dampens to medium)', () => {
    expect(rankUndefinedTermSeverity(5, true)).toBe('medium');
  });

  it('returns "medium" for 2 usages', () => {
    expect(rankUndefinedTermSeverity(2, false)).toBe('medium');
  });

  it('returns "medium" for 4 usages of a non-role term (below high threshold)', () => {
    expect(rankUndefinedTermSeverity(4, false)).toBe('medium');
  });

  it('returns "low" for 1 usage', () => {
    expect(rankUndefinedTermSeverity(1, false)).toBe('low');
  });

  it('returns "low" for 1 usage of a role term', () => {
    expect(rankUndefinedTermSeverity(1, true)).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// definition-extractor.ts
// ---------------------------------------------------------------------------

describe('extractDefinitions', () => {
  const DOC_ID = 'doc1';
  const TITLE = 'Test Agreement';

  it('extracts a "means" pattern definition', () => {
    const text = '"Confidential Information" means any information disclosed by one party.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(1);
    expect(defs[0].term).toBe('Confidential Information');
    expect(defs[0].normalizedTerm).toBe('confidential information');
    expect(defs[0].pattern).toBe('means');
    expect(defs[0].definition).toContain('any information disclosed');
  });

  it('extracts a "shall mean" pattern definition', () => {
    const text = '"Force Majeure Event" shall mean any event beyond reasonable control.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(1);
    expect(defs[0].term).toBe('Force Majeure Event');
    expect(defs[0].pattern).toBe('shall_mean');
  });

  it('extracts an "includes" pattern definition', () => {
    const text = '"Services" includes all deliverables and professional services provided.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(1);
    expect(defs[0].term).toBe('Services');
    expect(defs[0].pattern).toBe('includes');
  });

  it('extracts a "has the meaning given in" pattern definition', () => {
    const text = '"Intellectual Property Rights" has the meaning given in clause 5 of this agreement.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(1);
    expect(defs[0].term).toBe('Intellectual Property Rights');
    expect(defs[0].pattern).toBe('has_the_meaning');
  });

  it('extracts a "has the meaning set forth" pattern definition', () => {
    const text = '"Licensed Software" has the meaning set forth in Schedule A.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(1);
    expect(defs[0].pattern).toBe('has_the_meaning');
  });

  it('extracts multiple definitions from multi-line text in line order', () => {
    const text = [
      '"Software" means the application platform.',
      '"Services" means the professional services provided.',
      '"Term" means the initial term of this agreement.',
    ].join('\n');
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(3);
    expect(defs[0].term).toBe('Software');
    expect(defs[1].term).toBe('Services');
    expect(defs[2].term).toBe('Term');
  });

  it('skips a term that fails isLikelyDefinedTerm (stop word)', () => {
    const text = '"Agreement" means the master services agreement.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(0);
  });

  it('skips a term that fails isLikelyDefinedTerm (too short)', () => {
    // "IP" is only 2 chars → filtered
    const text = '"IP" means intellectual property rights.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(0);
  });

  it('sets location.documentId and documentTitle', () => {
    const text = '"Software" means the application platform.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs[0].location.documentId).toBe(DOC_ID);
    expect(defs[0].location.documentTitle).toBe(TITLE);
  });

  it('sets location.line based on position in text', () => {
    const text = ['first line', '"Software" means the application platform.'].join('\n');
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs[0].location.line).toBe(2);
  });

  it('does not duplicate the same definition extracted at the same offset', () => {
    // Both "means" and another pattern could hypothetically match — deduplication by offset
    const text = '"Software" means the application platform provided under this agreement.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    // Should appear at most once per offset
    const terms = defs.map((d) => d.term);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it('uses left curly double quote (“) as opening delimiter', () => {
    const text = '“Personal Data” means any data relating to identified individuals.';
    const defs = extractDefinitions(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(defs).toHaveLength(1);
    expect(defs[0].term).toBe('Personal Data');
  });
});

// ---------------------------------------------------------------------------
// reference-graph.ts
// ---------------------------------------------------------------------------

describe('extractReferences', () => {
  const DOC_ID = 'doc1';
  const TITLE = 'Test Agreement';

  it('extracts a "Section N" reference', () => {
    const text = 'The obligations are set out in Section 5 of this agreement.';
    const refs = extractReferences(DOC_ID, TITLE, text, NO_SECTIONS);
    const ref = refs.find((r) => r.normalizedTarget === 'section:5');
    expect(ref).toBeDefined();
    expect(ref?.targetType).toBe('section');
    expect(ref?.targetLabel).toBe('5');
  });

  it('extracts a "Clause N.N" reference', () => {
    const text = 'As defined in Clause 3.2, the vendor shall provide services.';
    const refs = extractReferences(DOC_ID, TITLE, text, NO_SECTIONS);
    const ref = refs.find((r) => r.normalizedTarget === 'section:3.2');
    expect(ref).toBeDefined();
    expect(ref?.targetType).toBe('section');
  });

  it('extracts a "Schedule A" reference', () => {
    const text = 'The pricing is set out in Schedule A.';
    const refs = extractReferences(DOC_ID, TITLE, text, NO_SECTIONS);
    const ref = refs.find((r) => r.normalizedTarget === 'schedule:a');
    expect(ref).toBeDefined();
    expect(ref?.targetType).toBe('schedule');
  });

  it('extracts an "Annex B" reference', () => {
    const refs = extractReferences(DOC_ID, TITLE, 'Refer to Annex B for details.', NO_SECTIONS);
    expect(refs.find((r) => r.normalizedTarget === 'annex:b')).toBeDefined();
  });

  it('extracts an "Exhibit C" reference', () => {
    const refs = extractReferences(DOC_ID, TITLE, 'As described in Exhibit C.', NO_SECTIONS);
    expect(refs.find((r) => r.normalizedTarget === 'exhibit:c')).toBeDefined();
  });

  it('extracts an "Attachment 1" reference', () => {
    const refs = extractReferences(DOC_ID, TITLE, 'See Attachment 1.', NO_SECTIONS);
    expect(refs.find((r) => r.normalizedTarget === 'attachment:1')).toBeDefined();
  });

  it('extracts a "MSA" document reference', () => {
    const refs = extractReferences(DOC_ID, TITLE, 'This SOW is subject to the MSA.', NO_SECTIONS);
    const ref = refs.find((r) => r.normalizedTarget === 'document:msa');
    expect(ref).toBeDefined();
    expect(ref?.targetType).toBe('document');
  });

  it('extracts a "DPA" document reference', () => {
    const refs = extractReferences(DOC_ID, TITLE, 'Processing is governed by the DPA.', NO_SECTIONS);
    expect(refs.find((r) => r.normalizedTarget === 'document:dpa')).toBeDefined();
  });

  it('extracts a "Master Services Agreement" document reference', () => {
    const refs = extractReferences(
      DOC_ID,
      TITLE,
      'Subject to the Master Services Agreement.',
      NO_SECTIONS,
    );
    expect(refs.find((r) => r.normalizedTarget === 'document:msa')).toBeDefined();
  });

  it('extracts multiple references from the same text', () => {
    const text = 'Refer to Section 2 and Section 3 for details, and Schedule A for pricing.';
    const refs = extractReferences(DOC_ID, TITLE, text, NO_SECTIONS);
    expect(refs.find((r) => r.normalizedTarget === 'section:2')).toBeDefined();
    expect(refs.find((r) => r.normalizedTarget === 'section:3')).toBeDefined();
    expect(refs.find((r) => r.normalizedTarget === 'schedule:a')).toBeDefined();
  });

  it('sets location.line correctly', () => {
    const text = 'first line\nRefer to Section 5.';
    const refs = extractReferences(DOC_ID, TITLE, text, NO_SECTIONS);
    const ref = refs.find((r) => r.normalizedTarget === 'section:5');
    expect(ref?.location.line).toBe(2);
  });

  it('does not duplicate a reference at the same offset', () => {
    const text = 'See Section 5 for details.';
    const refs = extractReferences(DOC_ID, TITLE, text, NO_SECTIONS);
    const section5Refs = refs.filter((r) => r.normalizedTarget === 'section:5');
    expect(section5Refs).toHaveLength(1);
  });
});

describe('buildStructuralTargets', () => {
  it('returns an empty set for documents with no structural targets', () => {
    const result = buildStructuralTargets([{ structuralTargets: new Set() }]);
    expect(result.size).toBe(0);
  });

  it('merges targets from multiple documents', () => {
    const result = buildStructuralTargets([
      { structuralTargets: new Set(['section:1', 'section:2']) },
      { structuralTargets: new Set(['schedule:a', 'section:2']) },
    ]);
    expect(result.has('section:1')).toBe(true);
    expect(result.has('section:2')).toBe(true);
    expect(result.has('schedule:a')).toBe(true);
    expect(result.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// parser.ts — parseContract
// ---------------------------------------------------------------------------

describe('parseContract', () => {
  describe('title and id', () => {
    it('uses the provided title', () => {
      const contract = parseContract({ text: 'Some text here.', title: 'My Agreement' });
      expect(contract.title).toBe('My Agreement');
    });

    it('infers title from the first meaningful line when none is provided', () => {
      const contract = parseContract({ text: 'Master Services Agreement\n\nBody text.' });
      expect(contract.title).toBe('Master Services Agreement');
    });

    it('uses the provided id', () => {
      const contract = parseContract({ text: 'Some text.', id: 'custom-id' });
      expect(contract.id).toBe('custom-id');
    });

    it('generates a stable id when none is provided', () => {
      const contract = parseContract({ text: 'Some text.', title: 'My Agreement' });
      expect(contract.id).toBeTruthy();
      expect(typeof contract.id).toBe('string');
    });
  });

  describe('document kind inference', () => {
    it('infers "msa" from title', () => {
      const contract = parseContract({ text: 'Body.', title: 'Master Services Agreement' });
      expect(contract.kind).toBe('msa');
    });

    it('infers "sow" from title', () => {
      const contract = parseContract({ text: 'Body.', title: 'Statement of Work' });
      expect(contract.kind).toBe('sow');
    });

    it('infers "dpa" from title', () => {
      const contract = parseContract({ text: 'Body.', title: 'Data Processing Agreement' });
      expect(contract.kind).toBe('dpa');
    });

    it('infers "order_form" from title', () => {
      const contract = parseContract({ text: 'Body.', title: 'Order Form' });
      expect(contract.kind).toBe('order_form');
    });

    it('infers "msa" from text when title has MSA abbreviation', () => {
      const contract = parseContract({ text: 'This MSA governs the relationship.', title: 'Contract' });
      expect(contract.kind).toBe('msa');
    });

    it('infers "unknown" when no recognisable keyword is present', () => {
      const contract = parseContract({ text: 'Generic terms.', title: 'Contract' });
      expect(contract.kind).toBe('unknown');
    });

    it('uses the provided kind and skips inference', () => {
      const contract = parseContract({ text: 'Generic terms.', title: 'Contract', kind: 'dpa' });
      expect(contract.kind).toBe('dpa');
    });
  });

  describe('section parsing', () => {
    it('parses numbered sections', () => {
      const text = '1. General Terms\nContent.\n2. Obligations\nMore content.';
      const contract = parseContract({ text, title: 'Agreement' });
      const nums = contract.sections.map((s) => s.clauseNumber);
      expect(nums).toContain('1');
      expect(nums).toContain('2');
    });

    it('produces a single fallback section when no headings are detected', () => {
      const text = 'This is a contract with no numbered headings at all.';
      const contract = parseContract({ text, title: 'Agreement' });
      expect(contract.sections).toHaveLength(1);
      expect(contract.sections[0].clauseNumber).toBe('');
    });

    it('parses sub-sections as children of their parent', () => {
      const text = '1. General\nContent.\n1.1 Definitions\nDefs.\n1.2 Scope\nScope.';
      const contract = parseContract({ text, title: 'Agreement' });
      const section1 = contract.sections.find((s) => s.clauseNumber === '1');
      expect(section1).toBeDefined();
      expect(section1?.childSections.map((c) => c.clauseNumber)).toContain('1.1');
      expect(section1?.childSections.map((c) => c.clauseNumber)).toContain('1.2');
    });

    it('parses schedule headings', () => {
      const text = 'Schedule A — Data Protection Requirements\nContent.';
      const contract = parseContract({ text, title: 'Agreement' });
      const scheduleSection = contract.sections.find((s) =>
        s.clauseNumber.toLowerCase().startsWith('schedule'),
      );
      expect(scheduleSection).toBeDefined();
    });

    it('normalises CRLF line endings', () => {
      const text = '1. General\r\nContent here.\r\n2. Services\r\nMore content.';
      const contract = parseContract({ text, title: 'Agreement' });
      expect(contract.rawText).not.toContain('\r');
    });
  });

  describe('structural targets', () => {
    it('includes parsed section numbers as structural targets', () => {
      const text = '1. General\nContent.\n2. Services\nMore content.';
      const contract = parseContract({ text, title: 'Agreement' });
      expect(contract.structuralTargets.has('section:1')).toBe(true);
      expect(contract.structuralTargets.has('section:2')).toBe(true);
    });

    it('includes document kind as a structural target', () => {
      const contract = parseContract({ text: 'Body.', title: 'Master Services Agreement' });
      expect(contract.structuralTargets.has('document:msa')).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Validators (tested via buildIntegrityContext for realistic pipeline coverage)
// ---------------------------------------------------------------------------

describe('duplicateDefinitionsValidator', () => {
  it('reports a duplicate when the same term is defined in two documents with different text', () => {
    const context = buildIntegrityContext([
      { text: '"Confidential Information" means any information disclosed in confidence.' },
      {
        text: '"Confidential Information" means any proprietary information of the disclosing party.',
      },
    ]);
    const issues = duplicateDefinitionsValidator.validate(context);
    const issue = issues.find((i) => i.metadata['term'] === 'Confidential Information');
    expect(issue).toBeDefined();
    expect(issue?.type).toBe('duplicate_definition');
    expect(issue?.severity).toBe('high'); // different definition text
  });

  it('reports medium severity when the same term is defined twice with identical text', () => {
    const sameText = '"Software" means the licensed application provided hereunder.';
    const context = buildIntegrityContext([
      { text: sameText + '\nAdditional content here.' },
      { text: sameText + '\nAdditional content here.' },
    ]);
    const issues = duplicateDefinitionsValidator.validate(context);
    const issue = issues.find((i) => i.metadata['term'] === 'Software');
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('medium'); // same definition text
  });

  it('reports no issue when each term is defined only once', () => {
    const context = buildIntegrityContext([
      {
        text: '"Software" means the application.\n"Service" means the consulting service.',
      },
    ]);
    const issues = duplicateDefinitionsValidator.validate(context);
    expect(issues).toHaveLength(0);
  });

  it('includes all definition locations in the issue', () => {
    const context = buildIntegrityContext([
      { text: '"Software" means the application platform.' },
      { text: '"Software" means the proprietary software suite.' },
    ]);
    const issue = duplicateDefinitionsValidator.validate(context)[0];
    expect(issue?.locations.length).toBeGreaterThanOrEqual(2);
  });
});

describe('undefinedTermsValidator', () => {
  it('reports a term that is used multiple times but never defined', () => {
    // Two occurrences on separate lines, each line ending with lowercase text
    // so the greedy multi-word regex cannot swallow one occurrence from the next
    // line. Each occurrence is far enough apart that excerptAt produces different
    // windows, giving distinct locationKeys that the deduplicator treats as two
    // separate usages.
    const text = [
      'The parties agree that all confidential material must be protected.',
      'Confidential Information must be stored securely by each recipient.',
      'Confidential Information shall not be disclosed without prior written consent.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = undefinedTermsValidator.validate(context);
    const issue = issues.find((i) => i.metadata['term'] === 'Confidential Information');
    expect(issue).toBeDefined();
    expect(issue?.type).toBe('undefined_defined_term');
    expect(issue?.metadata['usageCount']).toBeGreaterThanOrEqual(2);
  });

  it('assigns medium severity for 2 usages of a non-role term', () => {
    // Same structural approach: term on two separate lines, no cross-line greedy
    // match, and lines long enough for the excerpt windows to differ.
    const text = [
      'This agreement covers the use of licensed software applications.',
      'Licensed Software must be installed on approved devices only.',
      'Licensed Software may not be redistributed without written permission.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = undefinedTermsValidator.validate(context);
    const issue = issues.find((i) => i.metadata['term'] === 'Licensed Software');
    // 2 usages → medium
    expect(issue?.severity).toBe('medium');
  });

  it('reports no issue when the term is defined', () => {
    const text = [
      '"Confidential Information" means any information disclosed in confidence.',
      'The parties agree that Confidential Information must be protected.',
      'All Confidential Information shall be kept strictly secret.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = undefinedTermsValidator.validate(context);
    const issue = issues.find((i) => i.metadata['term'] === 'Confidential Information');
    expect(issue).toBeUndefined();
  });

  it('suppresses a single-use common role term (Customer, Supplier, etc.)', () => {
    // "Customer" used only once and is a common role term → should be skipped
    const text = 'The Customer shall pay the invoice within 30 days.';
    const context = buildIntegrityContext([{ text }]);
    const issues = undefinedTermsValidator.validate(context);
    const customerIssue = issues.find((i) => i.metadata['term'] === 'Customer');
    expect(customerIssue).toBeUndefined();
  });
});

describe('deadDefinitionsValidator', () => {
  it('reports a term that is defined but never used elsewhere', () => {
    const text = [
      '"Software" means the application platform provided under this agreement.',
      'The vendor shall deliver all required services to the client.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = deadDefinitionsValidator.validate(context);
    const issue = issues.find((i) => i.metadata['term'] === 'Software');
    expect(issue).toBeDefined();
    expect(issue?.type).toBe('dead_definition');
    expect(issue?.severity).toBe('low');
  });

  it('reports no issue when the defined term is used at least once elsewhere', () => {
    // "The Software" is greedily matched as a 2-word phrase that fails
    // isLikelyDefinedTerm ("The…" is filtered), so we start the second line
    // with the term directly to guarantee it's captured as a usage.
    const text = [
      '"Software" means the application platform provided under this agreement.',
      'Software updates shall be delivered within 30 days of the Effective Date.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = deadDefinitionsValidator.validate(context);
    const issue = issues.find((i) => i.metadata['term'] === 'Software');
    expect(issue).toBeUndefined();
  });

  it('does not count the definition line itself as a usage', () => {
    // "Software" appears only in its own definition → dead
    const text = '"Software" means the application platform and the Software documentation.';
    const context = buildIntegrityContext([{ text }]);
    const issues = deadDefinitionsValidator.validate(context);
    // "Software" on the definition line doesn't count → should still be dead
    // (The term on the definition line is excluded by the same-line filter)
    const issue = issues.find((i) => i.metadata['term'] === 'Software');
    expect(issue).toBeDefined();
  });

  it('detects a cross-document dead definition', () => {
    // Term defined in doc1 but never used in either document
    const context = buildIntegrityContext([
      { text: '"Escrow Agent" means the appointed escrow provider.' },
      { text: 'The vendor shall provide all services hereunder.' },
    ]);
    const issues = deadDefinitionsValidator.validate(context);
    const issue = issues.find((i) => i.metadata['term'] === 'Escrow Agent');
    expect(issue).toBeDefined();
  });
});

describe('brokenReferencesValidator', () => {
  it('reports a section reference with no matching section', () => {
    const text = [
      '1. General',
      'Content here.',
      '2. Obligations',
      'As set out in Section 5, the Supplier shall provide services.',
    ].join('\n');
    const context = buildIntegrityContext([{ text, title: 'Agreement' }]);
    const issues = brokenReferencesValidator.validate(context);
    const issue = issues.find((i) => i.metadata['missingTarget'] === 'section:5');
    expect(issue).toBeDefined();
    expect(issue?.type).toBe('broken_cross_reference');
    expect(issue?.severity).toBe('high'); // sections are high severity
  });

  it('reports a schedule reference with no matching schedule', () => {
    const text = [
      '1. Pricing',
      'Refer to Schedule B for the fee schedule.',
    ].join('\n');
    const context = buildIntegrityContext([{ text, title: 'Agreement' }]);
    const issues = brokenReferencesValidator.validate(context);
    const issue = issues.find((i) => i.metadata['missingTarget'] === 'schedule:b');
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('medium'); // non-section references are medium
  });

  it('reports a missing related document reference', () => {
    // Provide kind explicitly to prevent inferDocumentKind from seeing "Master
    // Services Agreement" in the text and classifying this document as 'msa',
    // which would add 'document:msa' to structuralTargets and resolve the reference.
    const context = buildIntegrityContext([
      {
        text: 'This Order Form is subject to the terms of the Master Services Agreement.',
        title: 'Order Form',
        kind: 'order_form',
      },
    ]);
    const issues = brokenReferencesValidator.validate(context);
    const issue = issues.find((i) => i.metadata['missingTarget'] === 'document:msa');
    expect(issue).toBeDefined();
    expect(issue?.type).toBe('missing_related_document');
  });

  it('reports no issue when the referenced section exists', () => {
    const text = [
      '1. General',
      'Content here.',
      '2. Obligations',
      'As set out in Section 2, the Supplier shall provide services.',
    ].join('\n');
    const context = buildIntegrityContext([{ text, title: 'Agreement' }]);
    const issues = brokenReferencesValidator.validate(context);
    const issue = issues.find((i) => i.metadata['missingTarget'] === 'section:2');
    expect(issue).toBeUndefined();
  });

  it('resolves a cross-document reference when the target document is provided', () => {
    // Use explicit kind on the Order Form so inferDocumentKind does not see
    // "Master Services Agreement" and misclassify the document as 'msa'.
    const orderForm = {
      text: 'This Order Form is subject to the terms of the Master Services Agreement.',
      title: 'Order Form',
      kind: 'order_form' as const,
    };
    const msa = {
      text: 'Governing terms.',
      title: 'Master Services Agreement',
      // kind inferred as 'msa' from title → adds 'document:msa' to targets
    };
    const context = buildIntegrityContext([orderForm, msa]);
    const issues = brokenReferencesValidator.validate(context);
    const issue = issues.find((i) => i.metadata['missingTarget'] === 'document:msa');
    expect(issue).toBeUndefined(); // MSA is provided → reference resolved
  });
});

describe('inconsistentCapitalizationValidator', () => {
  it('reports lowercase use of a defined single-word term in a generic drafting context', () => {
    const text = [
      '"Software" means the application platform described herein.',
      'The Supplier shall provide the software to the Customer upon request.',
      'All defects in the software shall be reported to the Supplier promptly.',
      'The software shall be updated at least quarterly by the Supplier.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = inconsistentCapitalizationValidator.validate(context);
    const issue = issues.find((i) => i.metadata['definedTerm'] === 'Software');
    expect(issue).toBeDefined();
    expect(issue?.type).toBe('inconsistent_capitalization');
  });

  it('assigns medium severity for 3 or more lowercase usages', () => {
    const text = [
      '"Software" means the application platform described herein.',
      'The Supplier shall provide the software to the Customer upon request.',
      'All defects in the software shall be reported to the Supplier promptly.',
      'The software shall be updated at least quarterly by the Supplier.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = inconsistentCapitalizationValidator.validate(context);
    const issue = issues.find((i) => i.metadata['definedTerm'] === 'Software');
    expect(issue?.severity).toBe('medium'); // 3 usages → medium
  });

  it('reports no issue when a term has no lowercase usages in generic contexts', () => {
    const text = [
      '"Software" means the application platform described herein.',
      'The Software shall be delivered within 30 days.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = inconsistentCapitalizationValidator.validate(context);
    const issue = issues.find((i) => i.metadata['definedTerm'] === 'Software');
    expect(issue).toBeUndefined();
  });

  it('reports no issue for multi-word defined terms (only single Title-Case words are checked)', () => {
    // "Confidential Information" → does not match /^[A-Z][a-z]+$/  → not tracked
    const text = [
      '"Confidential Information" means any proprietary data disclosed.',
      'The parties agree that the confidential information must be protected.',
    ].join('\n');
    const context = buildIntegrityContext([{ text }]);
    const issues = inconsistentCapitalizationValidator.validate(context);
    const issue = issues.find((i) => i.metadata['definedTerm'] === 'Confidential Information');
    expect(issue).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// engine.ts — runIntegrityEngine (integration)
// ---------------------------------------------------------------------------

describe('runIntegrityEngine', () => {
  it('returns an empty report for no inputs', () => {
    const report = runIntegrityEngine([]);
    expect(report.summary.documentCount).toBe(0);
    expect(report.summary.issueCount).toBe(0);
    expect(report.issues).toHaveLength(0);
  });

  it('summary.documentCount matches the number of input documents', () => {
    const report = runIntegrityEngine([
      { text: '"Software" means the application.', title: 'MSA' },
      { text: 'This SOW references the Software.', title: 'SOW' },
    ]);
    expect(report.summary.documentCount).toBe(2);
  });

  it('summary.issueCount equals the length of the issues array', () => {
    const report = runIntegrityEngine([
      {
        text: [
          'Service Agreement',
          '"Software" means the application platform.',
          'Refer to Section 99 for payment terms.',
        ].join('\n'),
        title: 'Agreement',
      },
    ]);
    expect(report.summary.issueCount).toBe(report.issues.length);
  });

  it('summary.issuesBySeverity totals match the number of issues', () => {
    const report = runIntegrityEngine([
      {
        text: [
          'Service Agreement',
          '"Software" means the application platform.',
          'Refer to Section 99 for payment terms.',
          'The Confidential Information must be protected at all times.',
          'Any Confidential Information disclosed shall be returned.',
        ].join('\n'),
        title: 'Agreement',
      },
    ]);
    const severityTotal = Object.values(report.summary.issuesBySeverity).reduce((a, b) => a + b, 0);
    expect(severityTotal).toBe(report.issues.length);
  });

  it('summary.issuesByType totals match the number of issues', () => {
    const report = runIntegrityEngine([
      {
        text: [
          '"Software" means the application platform.',
          'Refer to Section 99 for details.',
        ].join('\n'),
        title: 'Agreement',
      },
    ]);
    const typeTotal = Object.values(report.summary.issuesByType).reduce((a, b) => a + b, 0);
    expect(typeTotal).toBe(report.issues.length);
  });

  it('documents array lists parsed metadata for each input', () => {
    const report = runIntegrityEngine([
      { text: 'Body text here.', title: 'Master Services Agreement' },
    ]);
    expect(report.documents).toHaveLength(1);
    expect(report.documents[0].title).toBe('Master Services Agreement');
    expect(report.documents[0].kind).toBe('msa');
  });

  it('detects a broken cross-reference across a realistic contract', () => {
    const text = [
      'Service Agreement',
      '1. Definitions',
      '"Software" means the application platform.',
      '2. Obligations',
      'The Supplier shall provide the Software as described in Section 5.',
    ].join('\n');
    const report = runIntegrityEngine([{ text, title: 'Agreement' }]);
    const brokenRef = report.issues.find(
      (i) => i.type === 'broken_cross_reference' && i.metadata['missingTarget'] === 'section:5',
    );
    expect(brokenRef).toBeDefined();
  });

  it('has a non-empty generatedAt timestamp', () => {
    const report = runIntegrityEngine([{ text: 'Body.', title: 'Agreement' }]);
    expect(report.generatedAt).toBeTruthy();
    expect(new Date(report.generatedAt).getTime()).not.toBeNaN();
  });
});
