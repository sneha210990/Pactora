// Arm B: Single-LLM baseline.
//
// One Anthropic API call per contract asking Claude to extract all five clause
// types and return structured JSON. The prompt is reasonably thorough but not
// heavily optimised — this is the honest single-call baseline that Pactora's
// specialist-agent approach should beat on precision, at some cost in simplicity.
//
// Contract text is truncated to 60,000 characters to keep token costs predictable.
// This matches the practical limit of a single-pass approach without chunking.

import Anthropic from '@anthropic-ai/sdk';
import { calculateCostUsd } from '@/lib/agents/api-cost';
import { BENCHMARK_CLAUSE_TYPES } from '../types';
import type { BenchmarkClauseType, ArmClauseResult, ContractArmResult } from '../types';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 2_500;
const CONTRACT_CHAR_LIMIT = 60_000;

const SYSTEM_PROMPT = `You are a legal analyst reviewing commercial contracts on behalf of a software
company (the buyer). Your task is to identify specific high-risk clause types in the
contract text provided.

For each of the five clause types below, determine whether the clause is present and,
if so, quote the most relevant passage verbatim from the contract.

Clause types to identify:
1. Liability Cap — any clause that limits or caps a party's maximum financial liability,
   or any clause that explicitly states liability is uncapped or unlimited.
2. Indemnities — any indemnification, hold-harmless, or defend obligations that one party
   owes to the other or to third parties.
3. IP Ownership — any clause relating to ownership, assignment, transfer, or grant of
   intellectual property rights, including feedback, derivative works, or aggregated data.
4. Termination Rights — any right to terminate, cancel, or end the agreement early,
   including for convenience, change of control, or material breach.
5. Data Protection — any obligations relating to data protection, privacy, personal data
   processing, data security, or breach notification.

Return your response as valid JSON only — no prose, no markdown fences — in this exact shape:

{
  "liability_cap":       { "found": true, "quoted_text": "exact verbatim quote from contract", "location": "section or page reference if identifiable" },
  "indemnities":         { "found": false, "quoted_text": "", "location": "" },
  "ip_ownership":        { "found": true,  "quoted_text": "...", "location": "" },
  "termination_rights":  { "found": false, "quoted_text": "", "location": "" },
  "data_protection":     { "found": true,  "quoted_text": "...", "location": "" }
}

Rules:
- Set "found" to true only if the clause is clearly present.
- "quoted_text" must be copied verbatim from the contract — do not paraphrase.
- If "found" is false, set "quoted_text" to an empty string.
- If a clause type is absent, do not invent language.`;

type BaselineResponse = {
  liability_cap: { found: boolean; quoted_text: string; location: string };
  indemnities: { found: boolean; quoted_text: string; location: string };
  ip_ownership: { found: boolean; quoted_text: string; location: string };
  termination_rights: { found: boolean; quoted_text: string; location: string };
  data_protection: { found: boolean; quoted_text: string; location: string };
};

const KEY_MAP: Record<BenchmarkClauseType, keyof BaselineResponse> = {
  'Liability Cap': 'liability_cap',
  'Indemnities': 'indemnities',
  'IP Ownership': 'ip_ownership',
  'Termination Rights': 'termination_rights',
  'Data Protection': 'data_protection',
};

export async function runArmB(
  contractText: string,
): Promise<ContractArmResult> {
  const client = new Anthropic();
  const truncated = contractText.slice(0, CONTRACT_CHAR_LIMIT);

  let parsed: BaselineResponse | null = null;
  let costUsd = 0;
  let parseError: string | undefined;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Contract text:\n\n${truncated}`,
        },
      ],
    });

    const u = response.usage;
    costUsd = calculateCostUsd(MODEL, {
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';

    // Strip markdown fences if the model added them despite instructions.
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    parsed = JSON.parse(jsonStr) as BaselineResponse;
  } catch (err) {
    parseError = err instanceof Error ? err.message : String(err);
  }

  const clauseResults: Partial<Record<BenchmarkClauseType, ArmClauseResult>> = {};
  // Cost split evenly across clauses for per-clause cache storage.
  const perClauseCost = costUsd / BENCHMARK_CLAUSE_TYPES.length;

  for (const clauseType of BENCHMARK_CLAUSE_TYPES) {
    if (parseError || !parsed) {
      clauseResults[clauseType] = {
        found: false,
        quotedText: '',
        error: parseError ?? 'No response',
        costUsd: perClauseCost,
      };
      continue;
    }

    const key = KEY_MAP[clauseType];
    const entry = parsed[key];
    clauseResults[clauseType] = {
      found: entry?.found === true,
      quotedText: entry?.quoted_text ?? '',
      costUsd: perClauseCost,
    };
  }

  return {
    arm: 'b',
    clauseResults,
    totalCostUsd: costUsd,
    cachedFromDisk: false,
  };
}
