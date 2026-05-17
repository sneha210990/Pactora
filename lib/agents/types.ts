import type { ClauseFlag } from '@/lib/clause-analysis';
export type { CrossClauseRisk } from '@/lib/agents/cross-clause-engine';
import type { CrossClauseRisk } from '@/lib/agents/cross-clause-engine';

// All clause types covered by specialist agents.
// The first five have dedicated review pages; the last three surface in AI Clause Analysis.
export const PACTORA_CLAUSE_AGENTS = [
  'Liability Cap',
  'Indemnities',
  'IP Ownership',
  'Data Protection',
  'Termination Rights',
  'Auto-Renewal',
  'Fee Increases',
  'Governing Law',
] as const;

export type PactoraClauseType = (typeof PACTORA_CLAUSE_AGENTS)[number];

// SSE event shapes streamed by /api/contracts/analyze-agents.
// Clients should handle all variants and ignore unknown types for forward compat.
export type AgentEvent =
  | { type: 'agent_start'; clauseType: PactoraClauseType }
  | { type: 'agent_result'; clauseType: PactoraClauseType; flag: ClauseFlag | null }
  | { type: 'agent_error'; clauseType: PactoraClauseType; message: string }
  | { type: 'analysis_complete'; flags: ClauseFlag[]; crossClauseRisks: CrossClauseRisk[]; analyzedAt: string };
