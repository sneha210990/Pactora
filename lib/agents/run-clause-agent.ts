import type { ClauseFlag } from '@/lib/clause-analysis';
import type { PactoraClauseType } from './types';
import { getAnthropicClient } from './client';
import { CLAUSE_SYSTEM_PROMPTS } from './clause-prompts';

const MODEL = 'claude-sonnet-4-6';

// Each agent returns a flag + the full verbatim clause text for textarea pre-fill.
// Full clause sections can be several hundred words, so 2048 tokens is safe.
const MAX_TOKENS = 2048;

export type ClauseAgentResult =
  | { ok: true; flag: ClauseFlag | null }
  | { ok: false; error: string };

const REPORT_FLAG_TOOL = {
  name: 'report_clause_flag',
  description:
    'Report the single clause flag found for this clause type, or null if no relevant clause was identified.',
  input_schema: {
    type: 'object',
    properties: {
      flag: {
        description: 'The identified clause flag, or null if no relevant clause was found.',
        anyOf: [
          {
            type: 'object',
            properties: {
              clauseType: { type: 'string' },
              riskLevel: { type: 'string', enum: ['High', 'Medium', 'Low'] },
              clauseText: {
                type: 'string',
                description: 'Full verbatim text of all relevant clauses and sub-clauses',
              },
              problematicLanguage: {
                type: 'string',
                description: 'Verbatim quote of the single most problematic phrase, max 200 chars',
              },
              plainEnglish: {
                type: 'string',
                description: '1-2 sentence plain-English risk explanation for a non-lawyer buyer',
              },
              negotiationPoint: {
                type: 'string',
                description: '1-2 sentence specific, actionable ask',
              },
            },
            required: [
              'clauseType',
              'riskLevel',
              'clauseText',
              'problematicLanguage',
              'plainEnglish',
              'negotiationPoint',
            ],
          },
          { type: 'null' },
        ],
      },
    },
    required: ['flag'],
  },
};

// Runs a single specialist clause agent against the contract text.
// Called in parallel for all five clause types by the analyze-agents route.
//
// TODO (managed agents phase): replace direct client.messages.create with
// client.beta.sessions.send() once ANTHROPIC_AGENT_ID is provisioned:
//
//   const config = getManagedAgentConfig();
//   if (config) {
//     const session = await client.beta.sessions.create(config);
//     await client.beta.sessions.send(session.sessionId, userMessage);
//     // poll client.beta.sessions.events(session.sessionId, { after: lastEventId })
//   }
export async function runClauseAgent(
  clauseType: PactoraClauseType,
  contractText: string,
): Promise<ClauseAgentResult> {
  const client = getAnthropicClient();

  // Mirror the same 120 k truncation used by the existing analyzeContractClauses()
  const truncated = contractText.slice(0, 120_000);

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: CLAUSE_SYSTEM_PROMPTS[clauseType],
      tools: [REPORT_FLAG_TOOL],
      tool_choice: { type: 'tool', name: 'report_clause_flag' },
      messages: [
        {
          role: 'user',
          content: `Review the following SaaS contract for ${clauseType} risks:\n\n${truncated}`,
        },
      ],
    });

    const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      return { ok: false, error: 'No tool_use block in response' };
    }

    const input = toolUseBlock.input as { flag: ClauseFlag | null };
    return { ok: true, flag: input.flag ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
