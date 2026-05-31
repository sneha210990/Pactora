// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

export type ContractDocumentKind = 'msa' | 'sow' | 'dpa' | 'order_form' | 'schedule' | 'annex' | 'exhibit' | 'unknown';

export type IntegritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IntegrityIssueType =
  | 'undefined_defined_term'
  | 'duplicate_definition'
  | 'dead_definition'
  | 'broken_cross_reference'
  | 'inconsistent_capitalization'
  | 'missing_related_document';

export type IntegrityLocation = {
  documentId: string;
  documentTitle: string;
  sectionId?: string;
  sectionNumber?: string;
  sectionHeading?: string;
  line?: number;
  excerpt: string;
};

export type ContractSection = {
  id: string;
  heading: string;
  clauseNumber: string;
  rawText: string;
  lineStart: number;
  lineEnd: number;
  childSections: ContractSection[];
};

export type DefinitionPattern =
  | 'means'
  | 'shall_mean'
  | 'includes'
  | 'has_the_meaning'
  | 'definition_list';

export type ContractDefinition = {
  id: string;
  term: string;
  normalizedTerm: string;
  definition: string;
  pattern: DefinitionPattern;
  location: IntegrityLocation;
};

export type ReferenceTargetType = 'section' | 'schedule' | 'annex' | 'exhibit' | 'attachment' | 'document';

export type ContractReference = {
  id: string;
  text: string;
  normalizedTarget: string;
  targetType: ReferenceTargetType;
  targetLabel: string;
  location: IntegrityLocation;
};

export type DefinedTermUsage = {
  term: string;
  normalizedTerm: string;
  location: IntegrityLocation;
};

export type LowercaseTermUsage = {
  term: string;
  definedTerm: string;
  normalizedTerm: string;
  location: IntegrityLocation;
};

export type ParsedContract = {
  id: string;
  title: string;
  kind: ContractDocumentKind;
  rawText: string;
  sections: ContractSection[];
  definitions: ContractDefinition[];
  references: ContractReference[];
  definedTermUsages: DefinedTermUsage[];
  lowercaseTermUsages: LowercaseTermUsage[];
  structuralTargets: Set<string>;
};

export type ContractInput = {
  id?: string;
  title?: string;
  kind?: ContractDocumentKind;
  text: string;
};

export type IntegrityIssue = {
  type: IntegrityIssueType;
  severity: IntegritySeverity;
  message: string;
  locations: IntegrityLocation[];
  metadata: Record<string, unknown>;
};

export type IntegrityValidationContext = {
  documents: ParsedContract[];
  definitionsByTerm: Map<string, ContractDefinition[]>;
  structuralTargets: Set<string>;
};

export type IntegrityValidator = {
  id: IntegrityIssueType;
  description: string;
  validate: (context: IntegrityValidationContext) => IntegrityIssue[];
};

export type IntegrityReport = {
  id: string;
  generatedAt: string;
  summary: {
    documentCount: number;
    issueCount: number;
    issuesBySeverity: Record<IntegritySeverity, number>;
    issuesByType: Partial<Record<IntegrityIssueType, number>>;
  };
  documents: Array<{
    id: string;
    title: string;
    kind: ContractDocumentKind;
    sectionCount: number;
    definitionCount: number;
    referenceCount: number;
  }>;
  issues: IntegrityIssue[];
};
