import type { IntegrityIssue, IntegrityValidator } from '../types';

export const duplicateDefinitionsValidator: IntegrityValidator = {
  id: 'duplicate_definition',
  description: 'Detects terms that are defined more than once, including across schedules and related documents.',
  validate(context): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const definitions of context.definitionsByTerm.values()) {
      if (definitions.length < 2) continue;
      const uniqueDefinitionTexts = new Set(definitions.map((definition) => definition.definition.toLowerCase()));
      const term = definitions[0].term;

      issues.push({
        type: 'duplicate_definition',
        severity: uniqueDefinitionTexts.size > 1 ? 'high' : 'medium',
        message: `"${term}" is defined ${definitions.length} times${uniqueDefinitionTexts.size > 1 ? ' with different definition text' : ''}.`,
        locations: definitions.map((definition) => definition.location),
        metadata: {
          term,
          normalizedTerm: definitions[0].normalizedTerm,
          definitions: definitions.map((definition) => ({
            definition: definition.definition,
            documentId: definition.location.documentId,
            line: definition.location.line,
          })),
        },
      });
    }

    return issues;
  },
};
