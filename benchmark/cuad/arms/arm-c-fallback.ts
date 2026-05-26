// Arm C: Pactora + targeted fallback for commonly missed clause types.
//
// Runs Arm A first. For Liability Cap and Indemnities where Arm A returned
// nothing — the two types most affected by the known heading-matching bug —
// a second targeted LLM call scans the full document for that clause type only.
// The quoted text from the fallback call is then passed through a grounding check;
// it only counts as found if the quote can be confirmed to exist in the source.

import Anthropic from '@anthropic-ai/sdk';
import { calculateCostUsd } from '@/lib/agents/api-cost';
import { runArmA } from './arm-a-pactora';
import { checkGrounding } from '../grounding';
import { BENCHMARK_CLAUSE_TYPES } from '../types';
import type { BenchmarkClauseType, ArmClauseResult, ContractArmResult } from '../types';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1_500;
// Fallback scans the full contract — use a higher char limit than Arm B.
const CONTRACT_CHAR_LIMIT = 100_000;

// Only these two types get the fallback pass.
const FALLBACK_CLAUSE_TYPES: BenchmarkClauseType[] = [
  'Liability Cap',
  'Indemnities',
];

const FALLBACK_DEFINITIONS: Record<Extract<BenchmarkClauseType, 'Liability Cap' | 'Indemnities'>, string> = {
  'Liability Cap':
    'Any clause that limits or caps a party\'s maximum financial liability ' +
    '(e.g. "shall not exceed", "limited to fees paid", "in no event"), OR any clause ' +
    'that explicitly states liability is uncapped or unlimited.',
  'Indemnities':
    'Any indemnification, hold-harmless, or defend obligation ' +
    '(e.g. "indemnify", "defend and hold harmless", "save harmless", ' +
    '"indemnification"). Includes both mutual and one-way indemnities.',
};

function buildFallbackPrompt(clauseType: 'Liability Cap' | 'Indemnities'): string {
  const definition = FALLBACK_DEFINITIONS[clauseType];
  return (
    `You are reviewing a commercial contract for a single clause type.\n\n` +
    `Clause type: ${clauseType}\n` +
    `Definition: ${definition}\n\n` +
    `Search carefully through the ENTIRE document — the relevant language may appear ` +
    `in sections with unrelated headings (e.g. a liability cap inside a "Warranties" ` +
    `section, or an indemnity buried in "Miscellaneous").\n\n` +
    `If this clause type is present, copy the EXACT text verbatim — do not paraphrase.\n\n` +
    `Return valid JSON only:\n` +
    `{"found": true, "quoted_text": "exact verbatim text from contract"}\n` +
    `or\n` +
    `{"found": false, "quoted_text": ""}`
  );
}

async function runFallbackCall(
  clauseType: 'Liability Cap' | 'Indemnities',
  contractText: string,
  client: Anthropic,
): Promise<{ found: boolean; quotedText: string; costUsd: number; error?: string }> {
  const truncated = contractText.slice(0, CONTRACT_CHAR_LIMIT);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: buildFallbackPrompt(clauseType),
      messages: [
        {
          role: 'user',
          content: `Contract:\n\n${truncated}`,
        },
      ],
    });

    const u = response.usage;
    const costUsd = calculateCostUsd(MODEL, {
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const parsed = JSON.parse(jsonStr) as { found: boolean; quoted_text: string };
    return {
      found: parsed.found === true,
      quotedText: parsed.quoted_text ?? '',
      costUsd,
    };
  } catch (err) {
    return {
      found: false,
      quotedText: '',
      costUsd: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runArmC(
  contractText: string,
): Promise<ContractArmResult & { fallbackFired: BenchmarkClauseType[] }> {
  const client = new Anthropic();

  // Step 1: run Arm A as the base.
  const armAResult = await runArmA(contractText);

  // Copy Arm A results into Arm C, re-labelling as arm 'c'.
  const clauseResults: Partial<Record<BenchmarkClauseType, ArmClauseResult>> = {
    ...armAResult.clauseResults,
  };
  let totalCostUsd = armAResult.totalCostUsd;
  const fallbackFired: BenchmarkClauseType[] = [];

  // Step 2: targeted fallback for each eligible clause type where Arm A found nothing.
  for (const clauseType of FALLBACK_CLAUSE_TYPES) {
    const armAClause = clauseResults[clauseType];
    if (armAClause?.found) continue; // Already detected — skip fallback.

    fallbackFired.push(clauseType);

    const fallback = await runFallbackCall(
      clauseType as 'Liability Cap' | 'Indemnities',
      contractText,
      client,
    );
    totalCostUsd += fallback.costUsd;

    if (!fallback.found || !fallback.quotedText) {
      // Fallback also found nothing.
      clauseResults[clauseType] = {
        found: false,
        quotedText: '',
        grounded: false,
        costUsd: (armAClause?.costUsd ?? 0) + fallback.costUsd,
        error: fallback.error,
      };
      continue;
    }

    // Step 3: grounding check — only count as found if quote exists in source.
    const grounding = checkGrounding(fallback.quotedText, contractText);

    clauseResults[clauseType] = {
      found: grounding.grounded,
      quotedText: grounding.grounded ? fallback.quotedText : '',
      grounded: grounding.grounded,
      costUsd: (armAClause?.costUsd ?? 0) + fallback.costUsd,
    };
  }

  return {
    arm: 'c',
    clauseResults,
    totalCostUsd,
    cachedFromDisk: false,
    fallbackFired,
  };
}
