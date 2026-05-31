import type { IntegrityIssue, IntegrityValidator } from '../types';

export const duplicateDefinitionsValidator: IntegrityValidator = {
  id: 'duplicate_definition',
  description: 'Detects terms defined more than once, including across schedules and related documents.',
  validate(context): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];
    for (const definitions of context.definitionsByTerm.values()) {
      if (definitions.length < 2) continue;
      const uniqueTexts = new Set(definitions.map((d) => d.definition.toLowerCase()));
      const term = definitions[0].term;
      issues.push({
        type: 'duplicate_definition',
        severity: uniqueTexts.size > 1 ? 'high' : 'medium',
        message: `"${term}" is defined ${definitions.length} times${uniqueTexts.size > 1 ? ' with different definition text' : ''}.`,
        locations: definitions.map((d) => d.location),
        metadata: {
          term,
          normalizedTerm: definitions[0].normalizedTerm,
          definitions: definitions.map((d) => ({
            definition: d.definition,
            documentId: d.location.documentId,
            line: d.location.line,
          })),
        },
      });
    }
    return issues;
  },
};
