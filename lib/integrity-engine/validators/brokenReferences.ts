import type { IntegrityIssue, IntegrityValidator } from '../types';

export const brokenReferencesValidator: IntegrityValidator = {
  id: 'broken_cross_reference',
  description: 'Detects section, schedule, annex, exhibit, attachment, and related-document references with no matching target.',
  validate(context): IntegrityIssue[] {
    const issues: IntegrityIssue[] = [];

    for (const document of context.documents) {
      for (const reference of document.references) {
        if (context.structuralTargets.has(reference.normalizedTarget)) continue;

        issues.push({
          type: reference.targetType === 'document' ? 'missing_related_document' : 'broken_cross_reference',
          severity: reference.targetType === 'section' ? 'high' : 'medium',
          message: `${reference.text} is referenced in ${reference.location.documentTitle} but no matching ${reference.targetType} target was found in the uploaded document set.`,
          locations: [reference.location],
          metadata: {
            referenceText: reference.text,
            missingTarget: reference.normalizedTarget,
            targetType: reference.targetType,
            targetLabel: reference.targetLabel,
          },
        });
      }
    }

    return issues;
  },
};
