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

export function runIntegrityEngine(
  inputs: ContractInput[],
  validators: IntegrityValidator[] = DEFAULT_INTEGRITY_VALIDATORS,
): IntegrityReport {
  const documents = inputs.map((input, index) => parseContract(input, index));
  const context: IntegrityValidationContext = {
    documents,
    definitionsByTerm: buildDefinitionsByTerm(documents),
    structuralTargets: buildStructuralTargets(documents),
  };

  const issues = validators.flatMap((validator) => validator.validate(context));
  const issuesBySeverity = emptySeverityCounts();
  const issuesByType: IntegrityReport['summary']['issuesByType'] = {};

  for (const issue of issues) {
    issuesBySeverity[issue.severity] += 1;
    issuesByType[issue.type] = (issuesByType[issue.type] ?? 0) + 1;
  }

  return {
    id: stableId('integrity-report', new Date().toISOString(), documents.length, issues.length),
    generatedAt: new Date().toISOString(),
    summary: {
      documentCount: documents.length,
      issueCount: issues.length,
      issuesBySeverity,
      issuesByType,
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      kind: doc.kind,
      sectionCount: doc.sections.length,
      definitionCount: doc.definitions.length,
      referenceCount: doc.references.length,
    })),
    issues,
  };
}
