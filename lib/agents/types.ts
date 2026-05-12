import type { ClauseFlag } from '@/lib/clause-analysis';

// The five clause types that have dedicated review pages in Pactora.
// These become individual specialist agents in the managed-agents architecture.
export const PACTORA_CLAUSE_AGENTS = [
  'Liability Cap',
  'Indemnities',
  'IP Ownership',
  'Data Protection',
  'Termination Rights',
] as const;

export type PactoraClauseType = (typeof PACTORA_CLAUSE_AGENTS)[number];

// SSE event shapes streamed by /api/contracts/analyze-agents.
// Clients should handle all variants and ignore unknown types for forward compat.
export type AgentEvent =
  | { type: 'agent_start'; clauseType: PactoraClauseType }
  | { type: 'agent_result'; clauseType: PactoraClauseType; flag: ClauseFlag | null }
  | { type: 'agent_error'; clauseType: PactoraClauseType; message: string }
  | { type: 'analysis_complete'; flags: ClauseFlag[]; analyzedAt: string };
