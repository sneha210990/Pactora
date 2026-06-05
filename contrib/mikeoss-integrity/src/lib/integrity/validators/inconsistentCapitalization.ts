import type { IntegrityIssue, IntegrityValidator } from '../types';

export const inconsistentCapitalizationValidator: IntegrityValidator = {
  id: 'inconsistent_capitalization',
  description: 'Detects lowercase uses that likely intend to refer to an existing defined term.',
  validate(context): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const document of context.documents) {
      const usagesByTerm = new Map<string, typeof document.lowercaseTermUsages>();
      for (const usage of document.lowercaseTermUsages) {
        if (!context.definitionsByTerm.has(usage.normalizedTerm)) continue;
        const usages = usagesByTerm.get(usage.normalizedTerm) ?? [];
        usages.push(usage);
        usagesByTerm.set(usage.normalizedTerm, usages);
      }

      for (const usages of usagesByTerm.values()) {
        const first = usages[0];
        issues.push({
          type: 'inconsistent_capitalization',
          severity: usages.length >= 3 ? 'medium' : 'low',
          message: `"${first.definedTerm}" is a defined term, but lowercase "${first.term}" appears in drafting contexts that may intend the defined term.`,
          locations: usages.map((u) => u.location).slice(0, 25),
          metadata: {
            definedTerm: first.definedTerm,
            lowercaseUsage: first.term,
            usageCount: usages.length,
          },
        });
      }
    }

    return issues;
  },
};
