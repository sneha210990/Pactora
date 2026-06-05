// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { IntegrityLocation, IntegritySeverity } from './types';

const STOP_WORDS = new Set([
  'Agreement',
  'Section',
  'Sections',
  'Schedule',
  'Schedules',
  'Annex',
  'Annexes',
  'Exhibit',
  'Exhibits',
  'Attachment',
  'Attachments',
  'Party',
  'Parties',
  'Effective Date',
  'United States',
  'New York',
  'English Law',
]);

const LEGAL_ROLE_TERMS = new Set([
  'Customer',
  'Supplier',
  'Vendor',
  'Company',
  'Client',
  'Provider',
  'Processor',
  'Controller',
  'Licensor',
  'Licensee',
]);

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeTerm(term: string): string {
  return normalizeWhitespace(term)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^['"]|['"]$/g, '')
    .replace(/[.,;:]$/g, '')
    .toLowerCase();
}

export function normalizeStructuralTarget(kind: string, label: string): string {
  return `${kind.toLowerCase()}:${normalizeWhitespace(label).toLowerCase()}`;
}

export function stableId(...parts: Array<string | number | undefined>): string {
  return parts
    .filter((part): part is string | number => part !== undefined && part !== '')
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

export function excerptAt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + length + 80);
  return normalizeWhitespace(`${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`);
}

export function lineForIndex(text: string, index: number): number {
  return text.slice(0, Math.max(0, index)).split('\n').length;
}

export function isLikelyDefinedTerm(candidate: string): boolean {
  const term = normalizeWhitespace(candidate).replace(/^['"“”]+|['"“”]+$/g, '');
  if (term.length < 3 || term.length > 80) return false;
  if (STOP_WORDS.has(term)) return false;
  if (/^(This|That|These|Those|Each|Any|All|No|The|A|An)\b/.test(term)) return false;

  const words = term.split(/\s+/);
  if (words.length > 5) return false;

  return words.every((word) => {
    const cleaned = word.replace(/[^A-Za-z0-9-]/g, '');
    if (!cleaned) return false;
    return /^[A-Z][A-Za-z0-9-]*$/.test(cleaned) || /^[A-Z]{2,}$/.test(cleaned);
  });
}

export function isCommonLegalRoleTerm(term: string): boolean {
  return LEGAL_ROLE_TERMS.has(normalizeWhitespace(term));
}

export function locationKey(location: IntegrityLocation): string {
  return [location.documentId, location.sectionId, location.line, location.excerpt].join('|');
}

export function rankUndefinedTermSeverity(usageCount: number, isRoleTerm: boolean): IntegritySeverity {
  if (usageCount >= 5 && !isRoleTerm) return 'high';
  if (usageCount >= 2) return 'medium';
  return 'low';
}
