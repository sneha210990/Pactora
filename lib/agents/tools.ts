import type Anthropic from '@anthropic-ai/sdk';

// Typed tool schemas for Claude clause analysis.
//
// Using tool_choice: { type: 'any' } with these two tools gives us three
// guarantees that prompt-only JSON cannot:
//   1. Structural guarantee — the SDK validates required fields before we see them
//   2. Type fidelity — riskLevel is constrained to the enum at the API level
//   3. Explicit absence — no_issue_found makes "clean clause" an intentional signal,
//      not an inferred absence of output

export const FLAG_CLAUSE_TOOL: Anthropic.Tool = {
  name: 'flag_clause',
  description:
    'Report a risky clause found in the contract on behalf of a buyer reviewing a SaaS agreement. ' +
    'Call this once per clause type where you identify problematic language. ' +
    'Do NOT call this more than once for the same clause type.',
  input_schema: {
    type: 'object',
    properties: {
      clauseType: {
        type: 'string',
        description:
          'The clause category being flagged ' +
          '(e.g. "Liability Cap", "Indemnities", "IP Ownership", "Data Protection", ' +
          '"Termination Rights", "Auto-Renewal", "Fee Increases", "Governing Law").',
      },
      riskLevel: {
        type: 'string',
        enum: ['High', 'Medium', 'Low'],
        description:
          'High: significant financial or legal exposure, missing key buyer protection, or heavily one-sided. ' +
          'Medium: worth raising in negotiation but not a deal-breaker. ' +
          'Low: minor concern, acceptable in many commercial contexts.',
      },
      clauseText: {
        type: 'string',
        description:
          'Full verbatim text of every relevant clause and sub-clause on this topic from the contract. ' +
          'Do not paraphrase — copy exactly as written. ' +
          'This is shown to the buyer in the review interface so completeness matters.',
      },
      problematicLanguage: {
        type: 'string',
        description:
          'Verbatim quote of the single most problematic phrase or sentence from the contract. ' +
          'Maximum 200 characters. Choose the phrase that most directly illustrates the risk.',
      },
      plainEnglish: {
        type: 'string',
        description:
          '1-2 sentences explaining the risk in plain English for a non-lawyer buyer. ' +
          'State what the clause means in practice — not what it says.',
      },
      negotiationPositions: {
        type: 'object',
        description: 'Three negotiation positions the buyer can take, in descending order of strength.',
        properties: {
          ask: {
            type: 'object',
            description:
              'Opening position — state this first. If accepted, the buyer wins the point without conceding anything.',
            properties: {
              title: {
                type: 'string',
                description: 'Short label for this position, 3–6 words (e.g. "Mutual cap at 1× ACV").',
              },
              script: {
                type: 'string',
                description: 'Verbatim thing the buyer should say, 1–2 sentences.',
              },
            },
            required: ['title', 'script'],
          },
          fallback: {
            type: 'object',
            description:
              'Secondary position — move here if the Ask is rejected. Signals flexibility without revealing the floor.',
            properties: {
              title: { type: 'string', description: 'Short label, 3–6 words.' },
              script: { type: 'string', description: 'Verbatim thing the buyer should say, 1–2 sentences.' },
            },
            required: ['title', 'script'],
          },
          narrowing: {
            type: 'object',
            description:
              'A scope restriction rather than a number move — carve out the worst-case scenario instead of moving the headline figure.',
            properties: {
              title: { type: 'string', description: 'Short label, 3–6 words.' },
              script: { type: 'string', description: 'Verbatim thing the buyer should say, 1–2 sentences.' },
            },
            required: ['title', 'script'],
          },
        },
        required: ['ask', 'fallback', 'narrowing'],
      },
    },
    required: [
      'clauseType',
      'riskLevel',
      'clauseText',
      'problematicLanguage',
      'plainEnglish',
      'negotiationPositions',
    ],
  },
};

// Explicit "no risk found" signal. Forcing a deliberate call here prevents the
// ambiguity of "did Claude find nothing, or did it fail silently?" when tool_choice
// is set to 'any'. The reason field is logged for quality-monitoring purposes.
export const NO_ISSUE_FOUND_TOOL: Anthropic.Tool = {
  name: 'no_issue_found',
  description:
    'Report that no problematic clause was found for the clause type under review. ' +
    'Call this when the contract has no language in this area, ' +
    'or when the language present is clearly fair and acceptable to a buyer.',
  input_schema: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'One sentence explaining why no flag is raised.',
      },
    },
    required: ['reason'],
  },
};

// Specialist clause agents use both tools with tool_choice: { type: 'any' }.
// This forces Claude to call exactly one: either flag_clause (risk found) or
// no_issue_found (clean). Zero ambiguity, zero silent failures.
export const CLAUSE_AGENT_TOOLS: Anthropic.Tool[] = [FLAG_CLAUSE_TOOL, NO_ISSUE_FOUND_TOOL];
