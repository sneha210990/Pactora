import Anthropic from '@anthropic-ai/sdk';

export type RiskLevel = 'High' | 'Medium' | 'Low';

export type ClauseFlag = {
  clauseType: string;
  riskLevel: RiskLevel;
  problematicLanguage: string;
  plainEnglish: string;
  negotiationPoint: string;
  clauseText?: string;
};

export type ClauseAnalysis = {
  flags: ClauseFlag[];
  analyzedAt: string;
};

const SYSTEM_PROMPT = `You are a specialist SaaS contract lawyer reviewing agreements on behalf of a buyer (the customer/licensee). Analyze the provided contract text and identify risk clauses across these 8 categories:

1. Liability Cap – caps on the vendor's total liability (look for: capped at fees paid, low multiples, carve-outs that favour vendor)
2. Indemnities – indemnification obligations (look for: broad, one-sided, or uncapped indemnities against the buyer)
3. IP Ownership – intellectual property (look for: vendor claiming ownership of customer data, custom builds, or derived works)
4. Data Protection – GDPR and security (look for: missing DPA, inadequate breach notification windows, weak security obligations)
5. Termination Rights – contract termination (look for: vendor termination for convenience, missing cure periods, short notice)
6. Auto-Renewal – automatic renewal clauses (look for: short opt-out windows, automatic price increases on renewal)
7. Fee Increases – price escalation (look for: CPI increases, unilateral price change rights, indexation without cap)
8. Governing Law – choice of law and jurisdiction (look for: foreign jurisdiction, arbitration only, no injunctive relief carve-out)

Risk level guidance:
- High: Significant financial or legal exposure, heavily one-sided, missing key buyer protections
- Medium: Notable risk worth addressing in negotiation but not a deal-breaker
- Low: Minor concern worth flagging but acceptable in many contexts

Only include categories where you find actual problematic language. Quote verbatim. If no problematic clause exists for a category, omit it. Be specific and commercial.`;

const REPORT_FLAGS_TOOL = {
  name: 'report_clause_flags',
  description:
    'Report all risk clause flags identified in the contract. Pass an empty flags array if no risks are found.',
  input_schema: {
    type: 'object',
    properties: {
      flags: {
        type: 'array',
        description: 'Identified risk clause flags. Empty array if none found.',
        items: {
          type: 'object',
          properties: {
            clauseType: {
              type: 'string',
              description:
                'One of: Liability Cap, Indemnities, IP Ownership, Data Protection, Termination Rights, Auto-Renewal, Fee Increases, Governing Law',
            },
            riskLevel: { type: 'string', enum: ['High', 'Medium', 'Low'] },
            problematicLanguage: {
              type: 'string',
              description: 'Exact verbatim quote from the contract, max 200 chars',
            },
            plainEnglish: {
              type: 'string',
              description: 'Why this is risky for the buyer, 1-2 sentences',
            },
            negotiationPoint: {
              type: 'string',
              description: 'Specific, actionable negotiation point for the buyer, 1-2 sentences',
            },
          },
          required: [
            'clauseType',
            'riskLevel',
            'problematicLanguage',
            'plainEnglish',
            'negotiationPoint',
          ],
        },
      },
    },
    required: ['flags'],
  },
} satisfies Anthropic.Tool;

export async function analyzeContractClauses(contractText: string): Promise<ClauseAnalysis> {
  const client = new Anthropic();

  const truncatedText = contractText.slice(0, 120_000);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [REPORT_FLAGS_TOOL],
    tool_choice: { type: 'tool', name: 'report_clause_flags' },
    messages: [
      {
        role: 'user',
        content: `Analyze this SaaS contract for the 8 risk categories:\n\n${truncatedText}`,
      },
    ],
  });

  const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('No tool_use block in Claude response');
  }

  const input = toolUseBlock.input as { flags: ClauseFlag[] };

  return {
    flags: Array.isArray(input.flags) ? input.flags : [],
    analyzedAt: new Date().toISOString(),
  };
}
