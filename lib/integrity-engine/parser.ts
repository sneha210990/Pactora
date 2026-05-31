// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { ContractInput, ContractSection, ParsedContract } from './types';
import { extractDefinitions } from './definition-extractor';
import { extractReferences } from './reference-graph';
import {
  excerptAt,
  isLikelyDefinedTerm,
  lineForIndex,
  normalizeStructuralTarget,
  normalizeTerm,
  normalizeWhitespace,
  stableId,
} from './normalization';

const SECTION_HEADING_REGEX = /^(?:(?:section|clause)\s+)?(\d+(?:\.\d+)*|[A-Z])\.?\s+(.{2,140})$/i;
const SCHEDULE_HEADING_REGEX = /^(schedule|annex|exhibit|attachment)\s+([A-Z0-9]+)\b(?:\s*[-–—:]\s*(.*))?$/i;
const CAPITALIZED_TERM_REGEX = /(?:"|“)?\b([A-Z][A-Za-z0-9-]*(?:\s+[A-Z][A-Za-z0-9-]*){0,4})\b(?:"|”)?/g;

function inferDocumentKind(title: string, text: string): ParsedContract['kind'] {
  const haystack = `${title}\n${text.slice(0, 1000)}`.toLowerCase();
  if (/master services agreement|\bmsa\b/.test(haystack)) return 'msa';
  if (/statement of work|\bsow\b/.test(haystack)) return 'sow';
  if (/data processing agreement|\bdpa\b/.test(haystack)) return 'dpa';
  if (/order form/.test(haystack)) return 'order_form';
  if (/^\s*schedule\b/i.test(text) || /\bschedule\b/i.test(title)) return 'schedule';
  if (/\bannex\b/i.test(title)) return 'annex';
  if (/\bexhibit\b/i.test(title)) return 'exhibit';
  return 'unknown';
}

function titleFromText(text: string): string {
  const firstMeaningfulLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length >= 3 && line.length <= 120);

  return firstMeaningfulLine ?? 'Untitled Contract';
}

function createLocation(documentId: string, title: string, rawText: string, index: number, length: number, section?: ContractSection) {
  return {
    documentId,
    documentTitle: title,
    sectionId: section?.id,
    sectionNumber: section?.clauseNumber,
    sectionHeading: section?.heading,
    line: lineForIndex(rawText, index),
    excerpt: excerptAt(rawText, index, length),
  };
}

function parseSections(documentId: string, title: string, rawText: string): ContractSection[] {
  const lines = rawText.split('\n');
  const flatSections: ContractSection[] = [];
  let cursor = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lineStartIndex = cursor;
    cursor += line.length + 1;
    if (!trimmed || trimmed.length > 180) return;

    const scheduleMatch = trimmed.match(SCHEDULE_HEADING_REGEX);
    const sectionMatch = trimmed.match(SECTION_HEADING_REGEX);
    const match = scheduleMatch
      ? { clauseNumber: `${scheduleMatch[1]} ${scheduleMatch[2]}`, heading: scheduleMatch[3] || trimmed }
      : sectionMatch
        ? { clauseNumber: sectionMatch[1], heading: sectionMatch[2] }
        : null;

    if (!match) return;
    if (!/[A-Za-z]/.test(match.heading)) return;

    flatSections.push({
      id: stableId(documentId, 'section', match.clauseNumber, index + 1),
      clauseNumber: normalizeWhitespace(match.clauseNumber),
      heading: normalizeWhitespace(match.heading),
      rawText: '',
      lineStart: index + 1,
      lineEnd: index + 1,
      childSections: [],
    });

    // Keep lineStartIndex referenced so future parser adapters can preserve offsets.
    void lineStartIndex;
  });

  if (flatSections.length === 0) {
    return [
      {
        id: stableId(documentId, 'section', 'body'),
        clauseNumber: '',
        heading: title,
        rawText,
        lineStart: 1,
        lineEnd: lines.length,
        childSections: [],
      },
    ];
  }

  flatSections.forEach((section, index) => {
    const next = flatSections[index + 1];
    const startLine = section.lineStart;
    const endLine = next ? next.lineStart - 1 : lines.length;
    section.lineEnd = endLine;
    section.rawText = lines.slice(startLine - 1, endLine).join('\n').trim();
  });

  const roots: ContractSection[] = [];
  const stack: ContractSection[] = [];

  for (const section of flatSections) {
    const depth = section.clauseNumber.split('.').length;
    while (stack.length >= depth) stack.pop();

    const parent = stack[stack.length - 1];
    if (parent && /^\d/.test(section.clauseNumber) && /^\d/.test(parent.clauseNumber)) {
      parent.childSections.push(section);
    } else {
      roots.push(section);
    }

    stack.push(section);
  }

  return roots;
}

function flattenSections(sections: ContractSection[]): ContractSection[] {
  return sections.flatMap((section) => [section, ...flattenSections(section.childSections)]);
}

function findSectionForLine(sections: ContractSection[], line: number): ContractSection | undefined {
  return flattenSections(sections).find((section) => section.lineStart <= line && section.lineEnd >= line);
}

function extractDefinedTermUsages(documentId: string, title: string, rawText: string, sections: ContractSection[]) {
  const usages = [];
  for (const match of rawText.matchAll(CAPITALIZED_TERM_REGEX)) {
    const term = match[1];
    if (!isLikelyDefinedTerm(term)) continue;

    const index = match.index ?? 0;
    const line = lineForIndex(rawText, index);
    usages.push({
      term,
      normalizedTerm: normalizeTerm(term),
      location: createLocation(documentId, title, rawText, index, term.length, findSectionForLine(sections, line)),
    });
  }
  return usages;
}

function extractLowercaseTermUsages(documentId: string, title: string, rawText: string, sections: ContractSection[], definedTerms: string[]) {
  const usages = [];

  for (const definedTerm of definedTerms) {
    if (!/^[A-Z][a-z]+$/.test(definedTerm)) continue;
    const lower = definedTerm.toLowerCase();
    const regex = new RegExp(`\\b${lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

    for (const match of rawText.matchAll(regex)) {
      const index = match.index ?? 0;
      const before = rawText.slice(Math.max(0, index - 40), index).toLowerCase();
      const after = rawText.slice(index + lower.length, index + lower.length + 40).toLowerCase();
      const likelyGeneric = /\b(the|a|an|such|any|all|each|its|their)\s+$/.test(before) && !/\bmeans|shall mean|includes\b/.test(after);
      if (!likelyGeneric) continue;

      const line = lineForIndex(rawText, index);
      usages.push({
        term: lower,
        definedTerm,
        normalizedTerm: normalizeTerm(definedTerm),
        location: createLocation(documentId, title, rawText, index, lower.length, findSectionForLine(sections, line)),
      });
    }
  }

  return usages;
}

function collectStructuralTargets(sections: ContractSection[], title: string, kind: ParsedContract['kind']): Set<string> {
  const targets = new Set<string>();
  for (const section of flattenSections(sections)) {
    if (section.clauseNumber) {
      const [first, second] = section.clauseNumber.split(/\s+/, 2);
      if (/^(schedule|annex|exhibit|attachment)$/i.test(first) && second) {
        targets.add(normalizeStructuralTarget(first, second));
      } else {
        targets.add(normalizeStructuralTarget('section', section.clauseNumber));
      }
    }
  }

  const titleMatch = title.match(/\b(schedule|annex|exhibit|attachment)\s+([A-Z0-9]+)\b/i);
  if (titleMatch) targets.add(normalizeStructuralTarget(titleMatch[1], titleMatch[2]));
  if (kind !== 'unknown') targets.add(normalizeStructuralTarget('document', kind));

  return targets;
}

export function parseContract(input: ContractInput, fallbackIndex = 0): ParsedContract {
  const rawText = input.text.replace(/\r\n?/g, '\n').trim();
  const title = normalizeWhitespace(input.title ?? titleFromText(rawText));
  const id = input.id ?? stableId('contract', title, fallbackIndex);
  const kind = input.kind ?? inferDocumentKind(title, rawText);
  const sections = parseSections(id, title, rawText);
  const definitions = extractDefinitions(id, title, rawText, sections);
  const references = extractReferences(id, title, rawText, sections);
  const definedTermUsages = extractDefinedTermUsages(id, title, rawText, sections);
  const lowercaseTermUsages = extractLowercaseTermUsages(
    id,
    title,
    rawText,
    sections,
    definitions.map((definition) => definition.term),
  );

  return {
    id,
    title,
    kind,
    rawText,
    sections,
    definitions,
    references,
    definedTermUsages,
    lowercaseTermUsages,
    structuralTargets: collectStructuralTargets(sections, title, kind),
  };
}
