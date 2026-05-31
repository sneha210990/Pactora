// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { IntegrityIssue, IntegrityValidator } from '../types';
import { isCommonLegalRoleTerm, locationKey, rankUndefinedTermSeverity } from '../normalization';

export const undefinedTermsValidator: IntegrityValidator = {
  id: 'undefined_defined_term',
  description: 'Detects capitalized legal terms that are used but not defined in the document set.',
  validate(context): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];
    const usagesByTerm = new Map<string, typeof context.documents[number]['definedTermUsages']>();

    for (const document of context.documents) {
      for (const usage of document.definedTermUsages) {
        if (context.definitionsByTerm.has(usage.normalizedTerm)) continue;
        const usages = usagesByTerm.get(usage.normalizedTerm) ?? [];
        if (!usages.some((existing) => locationKey(existing.location) === locationKey(usage.location))) {
          usages.push(usage);
        }
        usagesByTerm.set(usage.normalizedTerm, usages);
      }
    }

    for (const usages of usagesByTerm.values()) {
      if (usages.length < 2 && isCommonLegalRoleTerm(usages[0].term)) continue;
      const term = usages[0].term;
      issues.push({
        type: 'undefined_defined_term',
        severity: rankUndefinedTermSeverity(usages.length, isCommonLegalRoleTerm(term)),
        message: `Potential defined term "${term}" is used ${usages.length} time(s) but is not defined in the uploaded document set.`,
        locations: usages.map((usage) => usage.location).slice(0, 25),
        metadata: { term, normalizedTerm: usages[0].normalizedTerm, usageCount: usages.length },
      });
    }

    return issues;
  },
};
