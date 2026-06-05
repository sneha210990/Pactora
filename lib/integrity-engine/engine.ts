// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type {
  ContractInput,
  IntegrityReport,
  IntegritySeverity,
  IntegrityValidationContext,
  IntegrityValidator,
  ParsedContract,
} from './types';
import { buildStructuralTargets } from './reference-graph';
import { parseContract } from './parser';
import { stableId } from './normalization';
import { brokenReferencesValidator } from './validators/brokenReferences';
import { deadDefinitionsValidator } from './validators/deadDefinitions';
import { duplicateDefinitionsValidator } from './validators/duplicateDefinitions';
import { inconsistentCapitalizationValidator } from './validators/inconsistentCapitalization';
import { undefinedTermsValidator } from './validators/undefinedTerms';

export const DEFAULT_INTEGRITY_VALIDATORS: IntegrityValidator[] = [
  duplicateDefinitionsValidator,
  undefinedTermsValidator,
  deadDefinitionsValidator,
  brokenReferencesValidator,
  inconsistentCapitalizationValidator,
];

function buildDefinitionsByTerm(documents: ParsedContract[]): IntegrityValidationContext['definitionsByTerm'] {
  const definitionsByTerm = new Map<string, ParsedContract['definitions']>();

  for (const document of documents) {
    for (const definition of document.definitions) {
      const definitions = definitionsByTerm.get(definition.normalizedTerm) ?? [];
      definitions.push(definition);
      definitionsByTerm.set(definition.normalizedTerm, definitions);
    }
  }

  return definitionsByTerm;
}

function emptySeverityCounts(): Record<IntegritySeverity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

export function buildIntegrityContext(inputs: ContractInput[]): IntegrityValidationContext {
  const documents = inputs.map((input, index) => parseContract(input, index));
  return {
    documents,
    definitionsByTerm: buildDefinitionsByTerm(documents),
    structuralTargets: buildStructuralTargets(documents),
  };
}

export function runIntegrityEngine(
  inputs: ContractInput[],
  validators: IntegrityValidator[] = DEFAULT_INTEGRITY_VALIDATORS,
): IntegrityReport {
  const context = buildIntegrityContext(inputs);
  const issues = validators.flatMap((validator) => validator.validate(context));
  const issuesBySeverity = emptySeverityCounts();
  const issuesByType: IntegrityReport['summary']['issuesByType'] = {};

  for (const issue of issues) {
    issuesBySeverity[issue.severity] += 1;
    issuesByType[issue.type] = (issuesByType[issue.type] ?? 0) + 1;
  }

  return {
    id: stableId('integrity-report', new Date().toISOString(), context.documents.length, issues.length),
    generatedAt: new Date().toISOString(),
    summary: {
      documentCount: context.documents.length,
      issueCount: issues.length,
      issuesBySeverity,
      issuesByType,
    },
    documents: context.documents.map((document) => ({
      id: document.id,
      title: document.title,
      kind: document.kind,
      sectionCount: document.sections.length,
      definitionCount: document.definitions.length,
      referenceCount: document.references.length,
    })),
    issues,
  };
}
