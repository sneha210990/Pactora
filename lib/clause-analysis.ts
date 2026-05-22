import Anthropic from '@anthropic-ai/sdk';
import { FLAG_CLAUSE_TOOL, NO_ISSUE_FOUND_TOOL } from '@/lib/agents/tools';

export type RiskLevel = 'High' | 'Medium' | 'Low';

export type NegotiationPosition = {
  title: string;
  script: string;
};

export type NegotiationLadder = {
  ask: NegotiationPosition;
  fallback: NegotiationPosition;
  narrowing: NegotiationPosition;
};

export type ClauseFlag = {
  clauseType: string;
  riskLevel: RiskLevel;
  problematicLanguage: string;
  plainEnglish: string;
  negotiationPoint: string;
  negotiationPositions?: NegotiationLadder;
  clauseText?: string;

  // From PROMPT 1 (hallucination verification)
  verified?: boolean;
  verificationNote?: string;
  position?: { start: number; end: number };

  // From PROMPT 2 (source location)
  pageNumber?: number;
  highlightRange?: { start: number; end: number };
};

export type ClauseAnalysis = {
  flags: ClauseFlag[];
  analyzedAt: string;
};

// Legacy monolithic analysis: one Claude call covers all 8 categories.
// Claude calls flag_clause once per risky category it finds (0–8 times).
// We collect every tool_use block with name 'flag_clause'.
//
// tool_choice: { type: 'any' } with both tools means:
//   • Claude MUST call at least one tool
//   • For a clean contract: Claude calls no_issue_found once → we return []
//   • For a contract with N risks: Claude calls flag_clause N times → we return N flags
//
// The new specialist-agent path (analyze-agents route) is preferred for production
// because it parallelises and provides richer per-category analysis. This path
// remains as a fallback for single-shot analysis scenarios.
const SYSTEM_PROMPT = `You are a specialist SaaS contract lawyer reviewing agreements on behalf of a buyer (the customer/licensee).
Analyse the provided contract text and identify risk clauses across these 8 categories:

1. Liability Cap — caps on the vendor's total liability (capped at fees paid, low multiples, carve-outs favouring vendor, asymmetric caps)
2. Indemnities — indemnification obligations (broad, one-sided, or uncapped indemnities against the buyer; missing vendor IP indemnity)
3. IP Ownership — intellectual property (vendor claiming ownership of customer data, derived works, anonymised datasets, or custom builds)
4. Data Protection — GDPR and security (missing DPA, inadequate breach notification windows, weak security obligations, sub-processor risks)
5. Termination Rights — contract termination (vendor termination for convenience, missing cure periods, short notice, automatic triggers)
6. Auto-Renewal — automatic renewal (short opt-out windows, renewal lock-in, price increases at renewal, multi-year renewal terms)
7. Fee Increases — price escalation (unilateral price change rights, uncapped CPI indexation, no exit right on price hike, usage overages)
8. Governing Law — choice of law and jurisdiction (foreign jurisdiction, mandatory arbitration, missing injunctive relief carve-out)

For each category where you find problematic language, call flag_clause once.
Do not call flag_clause for the same category more than once.
If the contract is entirely clean with no problematic language in any category, call no_issue_found.

Risk level guidance:
  High   — Significant financial or legal exposure, heavily one-sided, missing key buyer protections
  Medium — Notable risk worth addressing in negotiation but not a deal-breaker
  Low    — Minor concern worth flagging but acceptable in many commercial contexts`;

export async function analyzeContractClauses(contractText: string): Promise<ClauseAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in environment');
  const client = new Anthropic({ apiKey });

  const truncatedText = contractText.slice(0, 120_000);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    temperature: 0,
    tools: [FLAG_CLAUSE_TOOL, NO_ISSUE_FOUND_TOOL],
    // 'any' forces at least one tool call, eliminating the "silent empty response" failure mode.
    tool_choice: { type: 'any' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyse this SaaS contract across the 8 risk categories:\n\n${truncatedText}`,
            cache_control: { type: 'ephemeral' },
          },
        ],
      },
    ],
  });

  // Collect every flag_clause call. Claude may call it 0–8 times in one response.
  // no_issue_found and text blocks are intentionally ignored here.
  const flags: ClauseFlag[] = response.content
    .filter((block) => block.type === 'tool_use' && block.name === 'flag_clause')
    .map((block) => {
      // block.type === 'tool_use' guaranteed by filter above
      const input = (block as Extract<typeof block, { type: 'tool_use' }>).input as Record<
        string,
        unknown
      >;
      return {
        clauseType: (input.clauseType as string) ?? 'Unknown',
        riskLevel: (input.riskLevel as RiskLevel) ?? 'Medium',
        clauseText: (input.clauseText as string) ?? '',
        problematicLanguage: (input.problematicLanguage as string) ?? '',
        plainEnglish: (input.plainEnglish as string) ?? '',
        negotiationPoint: (input.negotiationPoint as string) ?? '',
      };
    });

  return {
    flags,
    analyzedAt: new Date().toISOString(),
  };
}
