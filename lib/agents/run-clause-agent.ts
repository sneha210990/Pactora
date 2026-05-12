import type { ClauseFlag } from '@/lib/clause-analysis';
import type { PactoraClauseType } from './types';
import { getAnthropicClient } from './client';
import { CLAUSE_SYSTEM_PROMPTS } from './clause-prompts';

const MODEL = 'claude-sonnet-4-6';

// Focused agents need far fewer tokens than the monolithic 8-category call
// because each only returns a single flag object (or null).
const MAX_TOKENS = 512;

export type ClauseAgentResult =
  | { ok: true; flag: ClauseFlag | null }
  | { ok: false; error: string };

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
      messages: [
        {
          role: 'user',
          content: `Review the following SaaS contract for ${clauseType} risks and return JSON:\n\n${truncated}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { ok: false, error: 'No text block in response' };
    }

    const raw = textBlock.text.trim();
    const jsonText = raw.startsWith('```')
      ? raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      : raw;

    const parsed = JSON.parse(jsonText) as { flag: ClauseFlag | null };
    return { ok: true, flag: parsed.flag ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
