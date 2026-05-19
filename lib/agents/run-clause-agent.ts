import type { ClauseFlag } from '@/lib/clause-analysis';
import type { PactoraClauseType } from './types';
import { getAnthropicClient } from './client';
import { CLAUSE_SYSTEM_PROMPTS } from './clause-prompts';
import { CLAUSE_AGENT_TOOLS } from './tools';
import { extractPDFMetadata, enrichFlagWithPageNumber } from '@/lib/pdf-utils';

const MODEL = 'claude-sonnet-4-6';

// Extended thinking is enabled selectively for the three legally complex clause types:
//
//   IP Ownership — requires multi-step reasoning across data-rights grants, feedback
//     licences, derived-work ownership, anonymisation carve-outs, and perpetual/
//     irrevocable licence interactions. A shallow read misses layered claims.
//
//   Indemnities — requires tracing whether indemnity obligations bypass the liability
//     cap ("notwithstanding the limitation of liability"), assessing directionality
//     across complex multi-party drafting, and evaluating trigger scope across
//     cross-referenced clause groups. Errors here carry the highest financial risk.
//
//   Liability Cap — cap provisions span multiple sub-clauses, carve-outs, and
//     cross-references that interact non-obviously (e.g. a mutual cap with a
//     one-sided data-breach carve-out). Detection failure is the primary reported
//     issue; extended thinking improves recall across non-standard phrasings.
//
// The remaining five clause types (Data Protection, Termination Rights,
// Auto-Renewal, Fee Increases, Governing Law) involve pattern recognition more than
// multi-step legal chains — standard inference is sufficient and cheaper.
const EXTENDED_THINKING_CLAUSE_TYPES = new Set<PactoraClauseType>([
  'Liability Cap',
  'IP Ownership',
  'Indemnities',
]);

const THINKING_BUDGET_TOKENS = 8_000;
// Must be strictly greater than THINKING_BUDGET_TOKENS to leave headroom for the
// tool call response (full verbatim clauseText + other fields).
const MAX_TOKENS_THINKING = 12_000;
// Standard agents: covers tool call overhead plus a full verbatim clause section.
const MAX_TOKENS_STANDARD = 2_048;

export type ClauseAgentResult =
  | { ok: true; flag: ClauseFlag | null }
  | { ok: false; error: string };

// Runs a single specialist clause agent against the contract text.
// Called in parallel for all eight clause types by the analyze-agents route.
//
// Tool-use architecture:
//   tool_choice: { type: 'any' } forces Claude to call exactly one tool per call:
//     • flag_clause      → risk found; input maps 1-to-1 to ClauseFlag
//     • no_issue_found   → contract is clean for this clause type; return null flag
//
//   This eliminates the previous JSON-parsing path (markdown stripping, JSON.parse,
//   null-check on the flag field) and makes absent-clause an explicit signal rather
//   than an inferred empty string.
//
// TODO (managed agents phase): replace direct client.messages.create with
// client.beta.sessions.send() once ANTHROPIC_AGENT_ID is provisioned.
export async function runClauseAgent(
  clauseType: PactoraClauseType,
  contractText: string,
): Promise<ClauseAgentResult> {
  const client = getAnthropicClient();

  // Mirror the same 120 k truncation used by analyzeContractClauses().
  const truncated = contractText.slice(0, 120_000);

  const withThinking = EXTENDED_THINKING_CLAUSE_TYPES.has(clauseType);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: withThinking ? MAX_TOKENS_THINKING : MAX_TOKENS_STANDARD,
      ...(withThinking ? { thinking: { type: 'enabled' as const, budget_tokens: THINKING_BUDGET_TOKENS } } : {}),
      tools: CLAUSE_AGENT_TOOLS,
      // 'any' = Claude MUST call one of the two tools. No text-only responses.
      // This is the key guarantee: every agent call returns a typed tool_use block.
      tool_choice: { type: 'any' },
      system: [
        {
          type: 'text',
          text: CLAUSE_SYSTEM_PROMPTS[clauseType],
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Review the following SaaS contract for ${clauseType} risks:\n\n${truncated}`,
              cache_control: { type: 'ephemeral' },
            },
          ],
        },
      ],
    });

    // With tool_choice: 'any', response.content always contains a tool_use block.
    // There may also be a preceding thinking block or text block — we skip both.
    const toolCall = response.content.find((b) => b.type === 'tool_use');
    if (!toolCall || toolCall.type !== 'tool_use') {
      return { ok: false, error: 'Claude did not call a tool (unexpected stop_reason)' };
    }

    if (toolCall.name === 'no_issue_found') {
      return { ok: true, flag: null };
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

      const pdfMetadata = extractPDFMetadata(contractText);
      const flag = enrichFlagWithPageNumber(baseFlag, pdfMetadata);

      return { ok: true, flag };
    }

    return { ok: false, error: `Unexpected tool called: ${toolCall.name}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
