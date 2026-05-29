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
import type { ClauseAgentUsage } from '@/lib/agents/run-clause-agent';
import { classifyPresentClauses } from '@/lib/agents/classify-clauses';
import { classifyContractType } from '@/lib/agents/classify-contract-type';
import { detectCrossClauseRisks } from '@/lib/agents/cross-clause-engine';
import { createOverlappingChunks, mergeChunkResults } from '@/lib/chunking-strategy';
import { PACTORA_CLAUSE_AGENTS } from '@/lib/agents/types';
import type { AgentEvent, PactoraClauseType } from '@/lib/agents/types';
import type { Jurisdiction } from '@/lib/document-analysis-store';
import type { ClauseFlag } from '@/lib/clause-analysis';
import { recordApiUsage } from '@/lib/beta-store';

export const runtime = 'nodejs';
// 5 parallel agents each with up to 60 s → 120 s ceiling gives headroom
export const maxDuration = 120;

function sseEvent(data: AgentEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

const VALID_JURISDICTIONS = new Set<string>(['england_wales', 'india', 'germany', 'france']);

export async function POST(request: Request) {
  let body: { text?: unknown; jurisdiction?: unknown };
  try {
    body = (await request.json()) as { text?: unknown; jurisdiction?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body.text !== 'string' || body.text.trim().length < 20) {
    return NextResponse.json({ error: 'Contract text is required.' }, { status: 400 });
  }

  const contractText = body.text;
  const jurisdiction: Jurisdiction | null =
    typeof body.jurisdiction === 'string' && VALID_JURISDICTIONS.has(body.jurisdiction)
      ? (body.jurisdiction as Jurisdiction)
      : null;

  const chunks = createOverlappingChunks(contractText);
  console.log(`[CHUNKING] Contract (${contractText.length} chars) split into ${chunks.length} chunk(s)`);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (event: AgentEvent) => controller.enqueue(enc.encode(sseEvent(event)));

      // AI-06: Pre-classify which clause types are present using a single cheap Haiku call.
      // AI-07: Classify contract type in parallel — independent of clause presence detection.
      // Absent clause types are skipped — saves the full specialist-agent cost for each one.
      // Falls back to all 8 agents if classification fails.
      const [presentClauses, contractType] = await Promise.all([
        classifyPresentClauses(contractText),
        classifyContractType(contractText),
      ]);
      const activeAgents = PACTORA_CLAUSE_AGENTS.filter((c) => presentClauses.has(c));
      const absentAgents = PACTORA_CLAUSE_AGENTS.filter((c) => !presentClauses.has(c));

      // Emit contract type before running agents so the client can calibrate UI immediately.
      emit({ type: 'contract_type_detected', contractType });

      // Immediately mark absent clause types as done (no agent ran, no flag found).
      for (const clauseType of absentAgents) {
        emit({ type: 'agent_result', clauseType, flag: null });
      }

      if (chunks.length === 1) {
        // Single-chunk path: preserve existing streaming behaviour — emit events as each agent resolves.
        const collectedFlags: ClauseFlag[] = [];
        const agentPromises = activeAgents.map(async (clauseType: PactoraClauseType) => {
          emit({ type: 'agent_start', clauseType });
          const result = await runClauseAgent(clauseType, contractText, chunks[0], contractType, jurisdiction);
          if (result.ok) {
            emit({ type: 'agent_result', clauseType, flag: result.flag });
            if (result.flag) collectedFlags.push(result.flag);
          } else {
            emit({ type: 'agent_error', clauseType, message: result.error });
          }
        });
        await Promise.allSettled(agentPromises);

        const crossClauseRisks = detectCrossClauseRisks(collectedFlags);
        emit({ type: 'analysis_complete', flags: collectedFlags, crossClauseRisks, analyzedAt: new Date().toISOString() });
      } else {
        // Multi-chunk path: analyse each chunk sequentially (agents within a chunk run in parallel),
        // then merge and deduplicate before emitting results.
        const rawResults: Array<{ chunkIndex: number; clauseType: PactoraClauseType; flag: ClauseFlag | null }> = [];

        for (const chunk of chunks) {
          console.log(`[CHUNKING] Processing chunk ${chunk.chunkIndex + 1}/${chunks.length} (chars ${chunk.startChar}–${chunk.endChar})`);
          const chunkPromises = activeAgents.map(async (clauseType: PactoraClauseType) => {
            const result = await runClauseAgent(clauseType, contractText, chunk, undefined, jurisdiction);
            return {
              chunkIndex: chunk.chunkIndex,
              clauseType,
              flag: result.ok ? result.flag : null,
            };
          });
          const settled = await Promise.allSettled(chunkPromises);
          for (const r of settled) {
            if (r.status === 'fulfilled') rawResults.push(r.value);
            else console.error(`[ERROR] Agent failed on chunk ${chunk.chunkIndex}:`, r.reason);
          }
        }

        const mergedFlags = mergeChunkResults(rawResults);
        console.log(`[ANALYSIS] Found ${mergedFlags.length} unique flag(s) across ${chunks.length} chunk(s)`);

        // Emit one agent_result per active clause type so clients receive the standard event shape.
        for (const clauseType of activeAgents) {
          const flag = mergedFlags.find((f) => f.clauseType === clauseType) ?? null;
          emit({ type: 'agent_result', clauseType, flag });
        }

        const crossClauseRisks = detectCrossClauseRisks(mergedFlags);
        emit({ type: 'analysis_complete', flags: mergedFlags, crossClauseRisks, analyzedAt: new Date().toISOString() });
      }

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
