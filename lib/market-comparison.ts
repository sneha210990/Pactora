// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import Anthropic from '@anthropic-ai/sdk';
import type { ClauseFlag } from '@/lib/clause-analysis';
import { getClauseReference } from '@/lib/clause-reference';
import type { ContractType } from '@/lib/agents/classify-contract-type';

type MarketPosition = 'standard' | 'flag' | 'win' | 'unknown';

// Tool-forced classification — matches the pattern used by every other model
// call in the agent pipeline (see lib/agents/tools.ts). Avoids free-text JSON
// parsing, which can silently misclassify on markdown-fence or formatting drift.
const CLASSIFY_MARKET_POSITION_TOOL: Anthropic.Tool = {
  name: 'classify_market_position',
  description: 'Classify an extracted contract clause against a market-standard reference.',
  input_schema: {
    type: 'object',
    properties: {
      classification: {
        type: 'string',
        enum: ['standard', 'flag', 'win'],
        description:
          'standard: matches the reference market position. ' +
          'flag: less favourable to the reviewing party than the reference. ' +
          'win: more favourable to the reviewing party than the reference.',
      },
      reason: {
        type: 'string',
        description: 'One sentence explaining the classification.',
      },
    },
    required: ['classification', 'reason'],
  },
};

async function compareToMarket(
  extractedText: string,
  reference: { standard: string; flag: string; win: string },
  client: Anthropic,
): Promise<{ position: MarketPosition; reason: string }> {
  const prompt = `Reference positions for England & Wales commercial contracts:

Standard: ${reference.standard}
Flag (unfavourable to you): ${reference.flag}
Win (favourable to you): ${reference.win}

Extracted clause:
${extractedText}

Classify this clause as "standard", "flag", or "win" relative to the reference above and call classify_market_position.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 0,
      tools: [CLASSIFY_MARKET_POSITION_TOOL],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system:
        'You are a commercial contracts analyst for England & Wales. You classify extracted contract clauses against a market standard reference.',
    });

    const toolCall = response.content.find((b) => b.type === 'tool_use');
    if (toolCall?.type === 'tool_use' && toolCall.name === 'classify_market_position') {
      const input = toolCall.input as { classification?: string; reason?: string };
      const classification = input.classification ?? '';
      const reason = typeof input.reason === 'string' ? input.reason : '';

      if (classification === 'standard' || classification === 'flag' || classification === 'win') {
        return { position: classification, reason };
      }
    }
  } catch {
    // API failure — fall through to unknown
  }

  return { position: 'unknown', reason: '' };
}

export async function enrichFlagsWithMarketPosition(
  flags: ClauseFlag[],
  contractType: ContractType | null,
  contractSide: 'supplier' | 'buyer' | null,
): Promise<ClauseFlag[]> {
  if (!contractType || !contractSide || flags.length === 0) return flags;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return flags;
  const client = new Anthropic({ apiKey });

  const enriched = await Promise.allSettled(
    flags.map(async (flag) => {
      const reference = getClauseReference(contractType, flag.clauseType, contractSide);
      if (!reference) return flag;

      const extractedText = flag.clauseText ?? flag.problematicLanguage ?? '';
      if (extractedText.length < 10) return flag;

      const comparison = await compareToMarket(extractedText, reference, client);
      return { ...flag, marketComparison: comparison };
    }),
  );

  return enriched.map((result, i) => (result.status === 'fulfilled' ? result.value : flags[i]));
}
