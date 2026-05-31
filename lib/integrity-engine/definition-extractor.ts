// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { ContractDefinition, ContractSection, DefinitionPattern } from './types';
import { excerptAt, isLikelyDefinedTerm, lineForIndex, normalizeTerm, normalizeWhitespace, stableId } from './normalization';

const DEFINITION_PATTERNS: Array<{ pattern: DefinitionPattern; regex: RegExp }> = [
  {
    pattern: 'shall_mean',
    regex: /["“]([^"”]{2,80})["”]\s+shall\s+mean\s+([^.;\n]+(?:\.[^\n]*)?)/gi,
  },
  {
    pattern: 'means',
    regex: /["“]([^"”]{2,80})["”]\s+means\s+([^.;\n]+(?:\.[^\n]*)?)/gi,
  },
  {
    pattern: 'includes',
    regex: /["“]([^"”]{2,80})["”]\s+includes\s+([^.;\n]+(?:\.[^\n]*)?)/gi,
  },
  {
    pattern: 'has_the_meaning',
    regex: /["“]([^"”]{2,80})["”]\s+has\s+the\s+meaning\s+(?:given|set\s+forth|ascribed)\s+(?:to\s+it\s+)?(?:in|under)\s+([^.;\n]+)/gi,
  },
  {
    pattern: 'definition_list',
    regex: /^\s*(?:\(([a-z])\)|([A-Z][A-Za-z0-9 -]{1,79}))\s*[–—:-]\s+["“]?([A-Z][A-Za-z0-9 -]{1,79})["”]?\s+(?:means|shall mean|includes)\s+([^.;\n]+(?:\.[^\n]*)?)/gim,
  },
];

function flattenSections(sections: ContractSection[]): ContractSection[] {
  return sections.flatMap((section) => [section, ...flattenSections(section.childSections)]);
}

function findSectionForLine(sections: ContractSection[], line: number): ContractSection | undefined {
  return flattenSections(sections).find((section) => section.lineStart <= line && section.lineEnd >= line);
}

export function extractDefinitions(
  documentId: string,
  documentTitle: string,
  rawText: string,
  sections: ContractSection[],
): ContractDefinition[] {
  const definitions: ContractDefinition[] = [];
  const seenAtOffset = new Set<string>();

  for (const { pattern, regex } of DEFINITION_PATTERNS) {
    for (const match of rawText.matchAll(regex)) {
      const index = match.index ?? 0;
      const term = pattern === 'definition_list' ? match[3] : match[1];
      const definition = pattern === 'definition_list' ? match[4] : match[2];
      if (!term || !definition || !isLikelyDefinedTerm(term)) continue;

      const key = `${normalizeTerm(term)}:${index}`;
      if (seenAtOffset.has(key)) continue;
      seenAtOffset.add(key);

      const line = lineForIndex(rawText, index);
      const section = findSectionForLine(sections, line);
      definitions.push({
        id: stableId(documentId, 'definition', term, line, definitions.length),
        term: normalizeWhitespace(term),
        normalizedTerm: normalizeTerm(term),
        definition: normalizeWhitespace(definition),
        pattern,
        location: {
          documentId,
          documentTitle,
          sectionId: section?.id,
          sectionNumber: section?.clauseNumber,
          sectionHeading: section?.heading,
          line,
          excerpt: excerptAt(rawText, index, match[0].length),
        },
      });
    }
  }

  return definitions.sort((a, b) => (a.location.line ?? 0) - (b.location.line ?? 0));
}
