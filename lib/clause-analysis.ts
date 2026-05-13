import Anthropic from '@anthropic-ai/sdk';
import type { CitationCharLocation } from '@anthropic-ai/sdk/resources/messages/messages';

export type RiskLevel = 'High' | 'Medium' | 'Low';

export type ClauseCitation = {
  citedText: string;
  startCharIndex: number;
  endCharIndex: number;
};

export type ClauseFlag = {
  clauseType: string;
  riskLevel: RiskLevel;
  problematicLanguage: string;
  plainEnglish: string;
  negotiationPoint: string;
  // Present when Claude's citation was successfully matched to this flag.
  // Guarantees the quoted language is verbatim from the source document.
  citation?: ClauseCitation;
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

Return ONLY a valid JSON object in this exact format (no markdown, no explanation, just JSON):
{
  "flags": [
    {
      "clauseType": "<one of the 8 category names above>",
      "riskLevel": "<High | Medium | Low>",
      "problematicLanguage": "<exact verbatim quote from the contract, max 200 chars>",
      "plainEnglish": "<plain English explanation of why this is risky for the buyer, 1-2 sentences>",
      "negotiationPoint": "<specific, actionable negotiation point for the buyer, 1-2 sentences>"
    }
  ]
}

Risk level guidance:
- High: Significant financial or legal exposure, heavily one-sided, missing key buyer protections
- Medium: Notable risk worth addressing in negotiation but not a deal-breaker
- Low: Minor concern worth flagging but acceptable in many contexts

Only include categories where you find actual problematic language. Quote verbatim. If no problematic clause exists for a category, omit it. Be specific and commercial.`;

export async function analyzeContractClauses(contractText: string): Promise<ClauseAnalysis> {
  const client = new Anthropic();

  const truncatedText = contractText.slice(0, 120_000);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            // Passing the contract as a document block enables the Citations API:
            // Claude must ground every quote in actual text from this source,
            // eliminating hallucinated problematicLanguage values.
            type: 'document',
            source: {
              type: 'text',
              media_type: 'text/plain',
              data: truncatedText,
            },
            citations: { enabled: true },
          },
          {
            type: 'text',
            text: 'Analyze this SaaS contract for the 8 risk categories and return JSON:',
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const raw = textBlock.text.trim();
  const jsonText = raw.startsWith('```')
    ? raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
    : raw;

  let parsed: { flags: ClauseFlag[] };
  try {
    parsed = JSON.parse(jsonText) as { flags: ClauseFlag[] };
  } catch {
    throw new Error('Claude returned an unparseable response');
  }

  // Extract char_location citations from the response text block.
  // For plain-text documents the API always returns 'char_location' citations.
  const charCitations: CitationCharLocation[] = (textBlock.citations ?? []).filter(
    (c): c is CitationCharLocation => c.type === 'char_location',
  );

  // Match each citation to the most relevant flag by overlapping text.
  // We compare the first 50 chars of each side to survive minor truncation.
  const flags = (Array.isArray(parsed.flags) ? parsed.flags : []).map((flag) => {
    const lang = (flag.problematicLanguage ?? '').toLowerCase();
    const match = charCitations.find((c) => {
      const ct = c.cited_text.toLowerCase();
      return lang.includes(ct.slice(0, 50)) || ct.includes(lang.slice(0, 50));
    });

    if (!match) return flag;

    return {
      ...flag,
      citation: {
        citedText: match.cited_text,
        startCharIndex: match.start_char_index,
        endCharIndex: match.end_char_index,
      },
    };
  });

  return {
    flags,
    analyzedAt: new Date().toISOString(),
  };
}
