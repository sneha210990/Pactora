// Parallel agent-based analysis endpoint.
//
// This route is additive — it runs ALONGSIDE the existing /api/contracts/analyze
// route and does not replace it. The existing route remains the live path;
// this one is activated by switching the client call once agents are validated.
//
// Architecture (current — direct parallel calls):
//   POST /api/contracts/analyze-agents
//     → runs 5 specialist clause agents concurrently (Promise.allSettled)
//     → streams each result as an SSE event the moment it resolves
//     → emits 'analysis_complete' once all agents finish
//
// Architecture (next step — durable managed agents):
//   Once ANTHROPIC_AGENT_ID + ANTHROPIC_ENVIRONMENT_ID are filled in .env.local,
//   replace runClauseAgent() calls with the session-polling pattern from
//   github.com/vercel-labs/claude-managed-agents-starter:
//
//     import { defineHook, sleep } from '@workflow/next';
//     const hook = defineHook();
//     const session = await client.beta.sessions.create(managedAgentConfig);
//     await client.beta.sessions.send(session.sessionId, message);
//     // poll:
//     for await (const batch of hook) {
//       const events = await client.beta.sessions.events(session.sessionId, {
//         after: lastEventId,
//       });
//       for (const ev of events) { ... }
//       await sleep('3s');
//     }

import { NextResponse } from 'next/server';
import { runClauseAgent } from '@/lib/agents/run-clause-agent';
import { detectCrossClauseRisks } from '@/lib/agents/cross-clause-engine';
import { PACTORA_CLAUSE_AGENTS } from '@/lib/agents/types';
import type { AgentEvent, PactoraClauseType } from '@/lib/agents/types';
import type { ClauseFlag } from '@/lib/clause-analysis';

export const runtime = 'nodejs';
// 5 parallel agents each with up to 60 s → 120 s ceiling gives headroom
export const maxDuration = 120;

function sseEvent(data: AgentEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  let body: { text?: unknown };
  try {
    body = (await request.json()) as { text?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body.text !== 'string' || body.text.trim().length < 20) {
    return NextResponse.json({ error: 'Contract text is required.' }, { status: 400 });
  }

  const contractText = body.text;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (event: AgentEvent) => controller.enqueue(enc.encode(sseEvent(event)));

      const collectedFlags: ClauseFlag[] = [];

      // Fire all five clause agents in parallel and stream each result as it arrives.
      // Promise.allSettled ensures one agent failure does not abort the others.
      const agentPromises = PACTORA_CLAUSE_AGENTS.map(async (clauseType: PactoraClauseType) => {
        emit({ type: 'agent_start', clauseType });
        const result = await runClauseAgent(clauseType, contractText);
        if (result.ok) {
          emit({ type: 'agent_result', clauseType, flag: result.flag });
          if (result.flag) collectedFlags.push(result.flag);
        } else {
          emit({ type: 'agent_error', clauseType, message: result.error });
        }
      });

      await Promise.allSettled(agentPromises);

      const crossClauseRisks = detectCrossClauseRisks(collectedFlags);

      emit({
        type: 'analysis_complete',
        flags: collectedFlags,
        crossClauseRisks,
        analyzedAt: new Date().toISOString(),
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
