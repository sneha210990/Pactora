import type { ClauseFlag } from '@/lib/clause-analysis';
import type { PactoraClauseType } from './types';
import { getAnthropicClient } from './client';
import { CLAUSE_SYSTEM_PROMPTS } from './clause-prompts';
import { CLAUSE_AGENT_TOOLS } from './tools';

const MODEL = 'claude-sonnet-4-6';

// 2048 covers the tool call overhead plus a full verbatim clause section.
// Increase to 4096 if very long contracts regularly produce truncated clauseText.
const MAX_TOKENS = 2048;

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

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
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
    // There may also be a preceding text block (Claude reasoning) — we skip it.
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
      const flag: ClauseFlag = {
        clauseType,
        riskLevel: (input.riskLevel as ClauseFlag['riskLevel']) ?? 'Medium',
        clauseText: (input.clauseText as string) ?? '',
        problematicLanguage: (input.problematicLanguage as string) ?? '',
        plainEnglish: (input.plainEnglish as string) ?? '',
        negotiationPoint: (input.negotiationPoint as string) ?? '',
      };
      return { ok: true, flag };
    }

    return { ok: false, error: `Unexpected tool called: ${toolCall.name}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
