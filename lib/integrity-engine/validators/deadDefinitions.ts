import type { IntegrityIssue, IntegrityValidator } from '../types';

export const deadDefinitionsValidator: IntegrityValidator = {
  id: 'dead_definition',
  description: 'Detects definitions that are never referenced after their definition.',
  validate(context): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const definitions of context.definitionsByTerm.values()) {
      const normalizedTerm = definitions[0].normalizedTerm;
      const laterUsages = context.documents.flatMap((document) =>
        document.definedTermUsages.filter((usage) => {
          if (usage.normalizedTerm !== normalizedTerm) return false;
          const sameDefinitionLine = definitions.some(
            (definition) =>
              definition.location.documentId === usage.location.documentId &&
              definition.location.line === usage.location.line,
          );
          return !sameDefinitionLine;
        }),
      );

      if (laterUsages.length > 0) continue;

      for (const definition of definitions) {
        issues.push({
          type: 'dead_definition',
          severity: 'low',
          message: `"${definition.term}" is defined but not referenced elsewhere in the uploaded document set.`,
          locations: [definition.location],
          metadata: {
            term: definition.term,
            normalizedTerm,
            definition: definition.definition,
          },
        });
      }
    }

    return issues;
  },
};
