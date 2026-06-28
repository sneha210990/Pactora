// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import Anthropic from '@anthropic-ai/sdk';
import type { ClauseFlag } from '@/lib/clause-analysis';
import { getClauseReference } from '@/lib/clause-reference';
import type { ContractType } from '@/lib/agents/classify-contract-type';

type MarketPosition = 'standard' | 'flag' | 'win' | 'unknown';

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

Classify this clause as "standard", "flag", or "win" relative to the reference above.
Return JSON only, no other text:
{"classification":"standard","reason":"one sentence explanation"}`;

  let text = '';
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system:
        'You are a commercial contracts analyst for England & Wales. You classify extracted contract clauses against a market standard reference. Respond only in JSON with no markdown fencing.',
    });

    const block = response.content.find((b) => b.type === 'text');
    text = block && 'text' in block ? block.text.trim() : '';

    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    const parsed = JSON.parse(text) as { classification?: string; reason?: string };
    const classification = parsed.classification ?? '';
    const reason = typeof parsed.reason === 'string' ? parsed.reason : '';

    if (classification === 'standard' || classification === 'flag' || classification === 'win') {
      return { position: classification, reason };
    }
  } catch {
    // Parsing or API failure — fall through to unknown
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
