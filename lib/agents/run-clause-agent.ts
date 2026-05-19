import type { ClauseFlag } from '@/lib/clause-analysis';
import type { ContractChunk } from '@/lib/chunking-strategy';
import type { PactoraClauseType } from './types';
import { getAnthropicClient } from './client';
import { CLAUSE_SYSTEM_PROMPTS } from './clause-prompts';
import { CLAUSE_AGENT_TOOLS } from './tools';
import { flagWithVerification } from './hallucination-check';
import { extractPDFMetadata, enrichFlagWithPageNumber } from '@/lib/pdf-utils';
import { calculateCostUsd } from './api-cost';

const SONNET = 'claude-sonnet-4-6';
const HAIKU  = 'claude-haiku-4-5-20251001';

// Extended thinking for the three legally complex clause types only.
// The other five (Data Protection, Termination Rights, Auto-Renewal, Fee Increases,
// Governing Law) are pattern-recognition tasks well within Haiku's capability.
const EXTENDED_THINKING_CLAUSE_TYPES = new Set<PactoraClauseType>([
  'Liability Cap',
  'IP Ownership',
  'Indemnities',
]);

// 4k thinking budget is sufficient for the multi-step legal chains these agents
// must trace. 8k was headroom we never needed and billed at $15/MTok output rate.
const THINKING_BUDGET_TOKENS = 4_000;
// Must be strictly greater than THINKING_BUDGET_TOKENS.
const MAX_TOKENS_THINKING = 6_000;
// Standard agents: covers tool call overhead plus a full verbatim clause section.
const MAX_TOKENS_STANDARD = 2_048;

export type ClauseAgentUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
};

export type ClauseAgentResult =
  | { ok: true; flag: ClauseFlag | null; usage: ClauseAgentUsage }
  | { ok: false; error: string };

// Runs a single specialist clause agent against the contract text.
// Called in parallel for all eight clause types by the analyze-agents route.
//
// Caching architecture:
//   The contract text sits in the FIRST system block with cache_control: ephemeral.
//   Because all eight agents share identical contract text, Anthropic caches it on the
//   first call and subsequent parallel calls pay only 10% of the input token price.
//   The clause-specific instructions sit in the SECOND system block (no cache_control)
//   — unique per agent, short (~600 tokens), not worth caching.
//
// Model selection:
//   Extended-thinking agents (Liability Cap, Indemnities, IP Ownership) use Sonnet —
//   they require multi-step legal chains that Haiku cannot reliably trace.
//   Standard agents use Haiku — pattern-recognition tasks at 20× cheaper output rate.
export async function runClauseAgent(
  clauseType: PactoraClauseType,
  contractText: string,
  chunk?: ContractChunk,
): Promise<ClauseAgentResult> {
  const client = getAnthropicClient();

  // When a chunk is provided (large-contract path), analyse only that slice.
  // Fall back to 120 k truncation for backward-compatible direct calls.
  const textToAnalyze = chunk ? chunk.text : contractText.slice(0, 120_000);

  const withThinking = EXTENDED_THINKING_CLAUSE_TYPES.has(clauseType);
  const model = withThinking ? SONNET : HAIKU;

  try {
    const response = await client.messages.create({
      model,
      max_tokens: withThinking ? MAX_TOKENS_THINKING : MAX_TOKENS_STANDARD,
      ...(withThinking ? { thinking: { type: 'enabled' as const, budget_tokens: THINKING_BUDGET_TOKENS } } : {}),
      tools: CLAUSE_AGENT_TOOLS,
      tool_choice: { type: 'any' },
      system: [
        {
          // Contract text first so it can be cached across all parallel agent calls.
          // All eight agents share this block identically — cache hit on calls 2-8.
          type: 'text',
          text: `The following is the full text of a SaaS contract under review:\n\n${textToAnalyze}`,
          cache_control: { type: 'ephemeral' },
        },
        {
          // Clause-specific instructions — unique per agent, not worth caching.
          type: 'text',
          text: CLAUSE_SYSTEM_PROMPTS[clauseType],
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Analyse the contract above for ${clauseType} risks and call the appropriate tool.`,
        },
      ],
    });

    const u = response.usage;
    const uAny = u as unknown as Record<string, number>;
    const usage: ClauseAgentUsage = {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheCreationTokens: uAny.cache_creation_input_tokens ?? 0,
      cacheReadTokens: uAny.cache_read_input_tokens ?? 0,
      costUsd: calculateCostUsd(model, {
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_creation_input_tokens: uAny.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: uAny.cache_read_input_tokens ?? 0,
      }),
    };

    // With tool_choice: 'any', response.content always contains a tool_use block.
    // There may also be a preceding thinking block or text block — we skip both.
    const toolCall = response.content.find((b) => b.type === 'tool_use');
    if (!toolCall || toolCall.type !== 'tool_use') {
      return { ok: false, error: 'Claude did not call a tool (unexpected stop_reason)' };
    }

    if (toolCall.name === 'no_issue_found') {
      return { ok: true, flag: null, usage };
    }

    if (toolCall.name === 'flag_clause') {
      const input = toolCall.input as Record<string, unknown>;

      // Override clauseType with the known agent type rather than trusting Claude's
      // returned string — prevents mislabelling if the model hallucinates a category name.
      const baseFlag: ClauseFlag = {
        clauseType,
        riskLevel: (input.riskLevel as ClauseFlag['riskLevel']) ?? 'Medium',
        clauseText: (input.clauseText as string) ?? '',
        problematicLanguage: (input.problematicLanguage as string) ?? '',
        plainEnglish: (input.plainEnglish as string) ?? '',
        negotiationPoint: (input.negotiationPoint as string) ?? '',
      };

      // PROMPT 1: verify extracted text exists in full contract (anti-hallucination).
      const verifiedFlag = flagWithVerification(baseFlag, contractText);
      if (!verifiedFlag.verified) {
        console.warn('[AUDIT] Clause text could not be verified in source:', {
          clauseType,
          text: baseFlag.clauseText?.slice(0, 50),
          note: verifiedFlag.verificationNote,
        });
      }

      // PROMPT 2: enrich with page number + highlight range from char offset.
      const pdfMetadata = extractPDFMetadata(contractText);
      const flag = enrichFlagWithPageNumber(verifiedFlag, pdfMetadata);

      return { ok: true, flag, usage };
    }

    return { ok: false, error: `Unexpected tool called: ${toolCall.name}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
