// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { PactoraClauseType } from './types';
import { PACTORA_CLAUSE_AGENTS } from './types';
import { getAnthropicClient } from './client';

const HAIKU = 'claude-haiku-4-5-20251001';

// Classification scans the first 40k chars — enough to detect which clause types
// are present without reading the whole contract (especially useful for long docs).
const CLASSIFY_TEXT_LIMIT = 40_000;

const CLASSIFY_TOOL = {
  name: 'report_present_clauses',
  description: 'Report which of the listed clause types are substantively present in this contract.',
  input_schema: {
    type: 'object' as const,
    properties: {
      presentClauses: {
        type: 'array',
        items: { type: 'string', enum: [...PACTORA_CLAUSE_AGENTS] },
        description:
          'Clause types that appear as substantive provisions in this contract. ' +
          'Only include types the contract actually addresses — omit types where the contract is entirely silent.',
      },
    },
    required: ['presentClauses'],
  },
};

const CLASSIFY_SYSTEM = `You are a contract classification assistant. Your only job is to identify which of the following clause types are substantively addressed in this contract: ${PACTORA_CLAUSE_AGENTS.join(', ')}.

A clause type is "present" if the contract contains at least one provision that addresses that topic, even briefly.
A clause type is "absent" if the contract is entirely silent on the topic.

Be inclusive — when in doubt, mark as present. False negatives (missing a present clause) are worse than false positives.`;

// Pre-classification step for AI-06: determine which clause types are present using a
// single cheap Haiku call before spinning up the 8 specialist agents. Absent clause
// types are skipped entirely, saving the full agent cost for each one.
//
// Falls back to the full agent set if the classification call fails, ensuring analysis
// always completes even when this step errors.
export async function classifyPresentClauses(contractText: string): Promise<Set<PactoraClauseType>> {
  const client = getAnthropicClient();
  const text = contractText.slice(0, CLASSIFY_TEXT_LIMIT);

  try {
    const response = await client.messages.create({
      model: HAIKU,
      max_tokens: 256,
      temperature: 0,
      tools: [CLASSIFY_TOOL],
      tool_choice: { type: 'any' },
      system: CLASSIFY_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Classify which clause types are present in this contract:\n\n${text}`,
        },
      ],
    });

    const toolCall = response.content.find((b) => b.type === 'tool_use');
    if (toolCall?.type === 'tool_use' && toolCall.name === 'report_present_clauses') {
      const input = toolCall.input as { presentClauses?: string[] };
      const present = new Set<PactoraClauseType>();
      for (const c of input.presentClauses ?? []) {
        if ((PACTORA_CLAUSE_AGENTS as readonly string[]).includes(c)) {
          present.add(c as PactoraClauseType);
        }
      }
      if (present.size > 0) {
        console.log(`[CLASSIFY] Present: [${[...present].join(', ')}] — skipping ${PACTORA_CLAUSE_AGENTS.length - present.size} absent clause type(s)`);
        return present;
      }
    }
  } catch (err) {
    console.warn('[CLASSIFY] Pre-classification failed — running all agents as fallback:', err instanceof Error ? err.message : err);
  }

  return new Set(PACTORA_CLAUSE_AGENTS);
}
