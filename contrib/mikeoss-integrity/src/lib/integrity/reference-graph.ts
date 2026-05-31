import type { ContractReference, ContractSection, ReferenceTargetType } from './types';
import { excerptAt, lineForIndex, normalizeStructuralTarget, normalizeWhitespace, stableId } from './normalization';

const REFERENCE_PATTERNS: Array<{ targetType: ReferenceTargetType; regex: RegExp }> = [
  { targetType: 'section', regex: /\b(?:Section|Sections|Clause|Clauses)\s+(\d+(?:\.\d+)*)\b/g },
  { targetType: 'schedule', regex: /\bSchedules?\s+([A-Z0-9]+)\b/g },
  { targetType: 'annex', regex: /\bAnnex(?:es)?\s+([A-Z0-9]+)\b/g },
  { targetType: 'exhibit', regex: /\bExhibits?\s+([A-Z0-9]+)\b/g },
  { targetType: 'attachment', regex: /\bAttachments?\s+([A-Z0-9]+)\b/g },
  {
    targetType: 'document',
    regex: /\b(MSA|Master Services Agreement|SOW|Statement of Work|DPA|Data Processing Agreement|Order Form)\b/g,
  },
];

const DOCUMENT_LABEL_TO_KIND: Record<string, string> = {
  msa: 'msa',
  'master services agreement': 'msa',
  sow: 'sow',
  'statement of work': 'sow',
  dpa: 'dpa',
  'data processing agreement': 'dpa',
  'order form': 'order_form',
};

function flattenSections(sections: ContractSection[]): ContractSection[] {
  return sections.flatMap((section) => [section, ...flattenSections(section.childSections)]);
}

function findSectionForLine(sections: ContractSection[], line: number): ContractSection | undefined {
  return flattenSections(sections).find((s) => s.lineStart <= line && s.lineEnd >= line);
}

function targetFor(type: ReferenceTargetType, label: string): string {
  if (type === 'document')
    return normalizeStructuralTarget('document', DOCUMENT_LABEL_TO_KIND[label.toLowerCase()] ?? label);
  return normalizeStructuralTarget(type, label);
}

export function extractReferences(
  documentId: string,
  documentTitle: string,
  rawText: string,
  sections: ContractSection[],
): ContractReference[] {
  const references: ContractReference[] = [];
  const seen = new Set<string>();

  for (const { targetType, regex } of REFERENCE_PATTERNS) {
    for (const match of rawText.matchAll(regex)) {
      const index = match.index ?? 0;
      const label = match[1];
      const text = match[0];
      const normalizedTarget = targetFor(targetType, label);
      const key = `${index}:${normalizedTarget}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const line = lineForIndex(rawText, index);
      const section = findSectionForLine(sections, line);
      references.push({
        id: stableId(documentId, 'reference', targetType, label, line, references.length),
        text: normalizeWhitespace(text),
        normalizedTarget,
        targetType,
        targetLabel: normalizeWhitespace(label),
        location: {
          documentId,
          documentTitle,
          sectionId: section?.id,
          sectionNumber: section?.clauseNumber,
          sectionHeading: section?.heading,
          line,
          excerpt: excerptAt(rawText, index, text.length),
        },
      });
    }
  }

  return references.sort((a, b) => (a.location.line ?? 0) - (b.location.line ?? 0));
}

export function buildStructuralTargets(documents: Array<{ structuralTargets: Set<string> }>): Set<string> {
  const targets = new Set<string>();
  for (const document of documents) {
    for (const target of document.structuralTargets) targets.add(target);
  }
  return targets;
}
