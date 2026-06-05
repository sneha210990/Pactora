// Copyright (C) 2024-2026 Sneha Sindhu
// SPDX-License-Identifier: AGPL-3.0-only

import type { ClauseFlag } from '@/lib/clause-analysis';
import type { ContractChunk } from '@/lib/chunking-strategy';
import type { PactoraClauseType } from './types';
import type { ContractType } from './classify-contract-type';
import type { Jurisdiction } from '@/lib/document-analysis-store';
import { getAnthropicClient } from './client';
import { CLAUSE_SYSTEM_PROMPTS } from './clause-prompts';
import { CLAUSE_AGENT_TOOLS } from './tools';
import { flagWithVerification } from './hallucination-check';
import { extractPDFMetadata, enrichFlagWithPageNumber } from '@/lib/pdf-utils';
import { calculateCostUsd } from './api-cost';

const SONNET = 'claude-sonnet-4-6';
const HAIKU  = 'claude-haiku-4-5-20251001';

// Extended thinking for the two legally complex clause types that require multi-step
// legal chain reasoning. Liability Cap was moved to Haiku (pattern-recognition: find
// a cap amount, check mutuality) — Sonnet+thinking was unnecessary overhead.
const EXTENDED_THINKING_CLAUSE_TYPES = new Set<PactoraClauseType>([
  'IP Ownership',
  'Indemnities',
]);

const JURISDICTION_CONTEXT: Record<Jurisdiction, string> = {
  england_wales: 'Jurisdiction: England & Wales. Apply English law — UCTA 1977 controls on exclusion clauses, Misrepresentation Act 1967, and standard English commercial law risk thresholds.',
  india: 'Jurisdiction: India. Apply Indian law — Indian Contract Act 1872 (penalty clause limits under s.74, restraint-of-trade under s.27), and standard Indian commercial law risk thresholds.',
  germany: 'Jurisdiction: Germany. Apply German law — BGB §§ 305-310 AGB-Recht standard terms controls, § 309 prohibited clauses, and civil-law risk thresholds.',
  france: 'Jurisdiction: France. Apply French law — Code civil significant imbalance rules (art. 1171), lois de police mandatory provisions, and civil-law risk thresholds.',
};

const CONTRACT_TYPE_CONTEXT: Record<ContractType, string> = {
  SaaS: 'Apply standard SaaS buyer-side risk thresholds.',
  NDA: 'Apply NDA norms — mutual confidentiality, limited liability scope, and automatic renewal are common. Calibrate risk ratings accordingly.',
  Employment: 'Apply employment contract norms — employer IP ownership of work product and restrictive covenants are often standard. Focus on scope that is unusually broad.',
  SupplyChain: 'Apply supply chain/procurement norms — price escalation and force majeure clauses are common. Focus on uncapped liability and asymmetric termination rights.',
  ProfessionalServices: 'Apply professional services norms — time-and-materials pricing, IP licence-back, and professional liability indemnities are expected.',
  Other: 'Apply general commercial contract risk thresholds.',
};

// 2k thinking budget handles the legal chains these two agents must trace.
// 4k was unused headroom billed at $15/MTok output rate.
const THINKING_BUDGET_TOKENS = 2_000;
// Must be strictly greater than THINKING_BUDGET_TOKENS.
const MAX_TOKENS_THINKING = 4_000;
// Haiku agents: 2000 is enough for the 3-position negotiation ladder (~400 output tokens).
const MAX_TOKENS_STANDARD = 2_000;

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
  contractType?: ContractType,
  jurisdiction?: Jurisdiction | null,
  contractSide?: 'supplier' | 'buyer' | null,
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
      // Extended thinking requires temperature=1 (API enforces it). Non-thinking
      // agents use temperature=0 for consistent, reproducible clause detection.
      ...(!withThinking ? { temperature: 0 } : {}),
      ...(withThinking ? { thinking: { type: 'enabled' as const, budget_tokens: THINKING_BUDGET_TOKENS } } : {}),
      tools: CLAUSE_AGENT_TOOLS,
      // Extended thinking forbids tool_choice forcing tool use ('any' / 'tool').
      // Thinking agents must use 'auto'; the model decides whether to call a tool.
      tool_choice: withThinking ? { type: 'auto' } : { type: 'any' },
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
          content: [
            {
              type: 'text',
              text: `Analyse the contract above for ${clauseType} risks and call the appropriate tool.${contractType ? `\n\nContract type context: ${CONTRACT_TYPE_CONTEXT[contractType]}` : ''}${jurisdiction ? `\n\n${JURISDICTION_CONTEXT[jurisdiction]}` : ''}${contractSide === 'supplier' ? '\n\nReviewing party: Supplier / Service provider. Flag risks that expose the supplier to uncapped liability, unfair IP assignment, onerous payment obligations, or asymmetric termination rights.' : contractSide === 'buyer' ? '\n\nReviewing party: Client / Buyer. Flag risks that limit the buyer\'s recourse, impose unfair liability on the buyer, restrict termination rights, or provide inadequate IP or data protection.' : ''}`,
            },
          ],
        },
      ],
    });

    const u = response.usage;
    const cacheCreation = u.cache_creation_input_tokens ?? 0;
    const cacheRead = u.cache_read_input_tokens ?? 0;
    const usage: ClauseAgentUsage = {
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheCreationTokens: cacheCreation,
      cacheReadTokens: cacheRead,
      costUsd: calculateCostUsd(model, {
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_creation_input_tokens: cacheCreation,
        cache_read_input_tokens: cacheRead,
      }),
    };

    // With tool_choice: 'any', response.content always contains a tool_use block.
    // There may also be a preceding thinking block or text block — we skip both.
    const toolCall = response.content.find((b) => b.type === 'tool_use');
    if (!toolCall || toolCall.type !== 'tool_use') {
      const firstText = response.content.find((b) => b.type === 'text');
      const preview = firstText && firstText.type === 'text' ? firstText.text.slice(0, 200) : '';
      return {
        ok: false,
        error: `No tool call (stop_reason=${response.stop_reason})${preview ? `: ${preview}` : ''}`,
      };
    }

    if (toolCall.name === 'no_issue_found') {
      return { ok: true, flag: null, usage };
    }

    if (toolCall.name === 'flag_clause') {
      const input = toolCall.input as Record<string, unknown>;

      const rawPos = input.negotiationPositions as {
        ask?: { title?: string; script?: string };
        fallback?: { title?: string; script?: string };
        narrowing?: { title?: string; script?: string };
      } | undefined;

      const negotiationPositions: ClauseFlag['negotiationPositions'] = rawPos
        ? {
            ask:      { title: rawPos.ask?.title ?? '',      script: rawPos.ask?.script ?? '' },
            fallback: { title: rawPos.fallback?.title ?? '', script: rawPos.fallback?.script ?? '' },
            narrowing: { title: rawPos.narrowing?.title ?? '', script: rawPos.narrowing?.script ?? '' },
          }
        : undefined;

      // Override clauseType with the known agent type rather than trusting Claude's
      // returned string — prevents mislabelling if the model hallucinates a category name.
      // negotiationPoint is derived from ask.script for backwards compat with the negotiate route.
      const baseFlag: ClauseFlag = {
        clauseType,
        riskLevel: (input.riskLevel as ClauseFlag['riskLevel']) ?? 'Medium',
        clauseText: (input.clauseText as string) ?? '',
        problematicLanguage: (input.problematicLanguage as string) ?? '',
        plainEnglish: (input.plainEnglish as string) ?? '',
        negotiationPoint: negotiationPositions?.ask.script ?? '',
        negotiationPositions,
        confidence: (input.confidence as ClauseFlag['confidence']) ?? undefined,
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
