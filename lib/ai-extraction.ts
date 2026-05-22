import Anthropic from '@anthropic-ai/sdk';
import { calculateCostUsd } from '@/lib/agents/api-cost';

// AI-powered commercial value extraction using Claude Haiku.
//
// Haiku is used here deliberately — not Sonnet. Extraction is a structured
// lookup task (find-and-return), not legal reasoning. Haiku is 20× cheaper,
// ~2× faster, and produces equivalent accuracy on extraction tasks.
//
// Architecture: this function runs IN PARALLEL with the regex extraction in
// the extract route. AI values win over regex values where both produce a result.
// If the Haiku call fails for any reason, the caller falls back to regex-only.
// The product always returns a result; AI failure degrades gracefully.

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Only send the first 60 k chars to Haiku. Commercial values (ACV, term, fees,
// liability cap, governing law) appear in the front matter, payment terms, and
// boilerplate — rarely beyond page 20. Sending the full 120 k would double
// the token cost with no extraction benefit.
const EXTRACTION_CHAR_LIMIT = 60_000;

const EXTRACT_VALUES_TOOL: Anthropic.Tool = {
  name: 'extract_contract_values',
  description:
    'Extract key commercial and legal metadata from a SaaS contract. ' +
    'Return null for any value you cannot confidently determine from the text. ' +
    'A null is always preferable to a hallucinated value.',
  input_schema: {
    type: 'object',
    properties: {
      acv: {
        type: ['number', 'null'] as unknown as 'number',
        description:
          'Annual contract value in the primary currency. ' +
          'Look for: ACV, annual fee, annual subscription fee, annual charges, total annual value, ' +
          'fees per annum, annual recurring revenue. ' +
          'Convert monthly fees × 12 or quarterly fees × 4 if the contract is clearly annual. ' +
          'Return null if not found, if fees are purely usage-based, or if ambiguous.',
      },
      termMonths: {
        type: ['integer', 'null'] as unknown as 'integer',
        description:
          'Initial contract term in months. Convert: 1 year = 12, 2 years = 24, 3 years = 36. ' +
          'Look for: "initial term", "subscription term", "service term", "term of the agreement". ' +
          'Return null if the term is perpetual, month-to-month, or not stated.',
      },
      insuranceCover: {
        type: ['number', 'null'] as unknown as 'number',
        description:
          'Minimum insurance coverage amount required in the primary currency. ' +
          'Look for: professional indemnity, PI, errors and omissions, E&O, cyber liability, ' +
          'public liability, general liability insurance requirements imposed on either party. ' +
          'Return null if no minimum amount is specified.',
      },
      dataType: {
        type: 'string',
        enum: ['standard', 'personal', 'sensitive'],
        description:
          '"sensitive" = special category data under GDPR Article 9 ' +
          '(health, biometric, genetic, racial/ethnic origin, political opinions, religion, ' +
          'trade union membership, sex life/orientation) or financial account credentials. ' +
          '"personal" = any personally identifiable information: names, emails, IP addresses, ' +
          'user IDs, employee data, customer records. ' +
          '"standard" = no personal data of any kind is mentioned in the contract.',
      },
      liabilityCap: {
        type: ['number', 'null'] as unknown as 'number',
        description:
          'Vendor liability cap amount in the primary currency. ' +
          'If stated as a fixed sum, return that sum. ' +
          'If stated as a multiple of fees (e.g. "fees paid in the preceding 12 months"), ' +
          'calculate the amount using the ACV you identified: 12-month multiple = ACV × 1. ' +
          'Return null if the cap is uncapped, if you cannot calculate it from available data, ' +
          'or if the liability clause is absent.',
      },
      governingLaw: {
        type: ['string', 'null'] as unknown as 'string',
        description:
          'Governing law jurisdiction exactly as stated. ' +
          'Examples: "England and Wales", "New York", "Delaware", "California", "Scotland". ' +
          'Return null if not stated.',
      },
      terminationNotice: {
        type: ['string', 'null'] as unknown as 'string',
        description:
          'Termination for convenience notice period as a human-readable string. ' +
          'Example: "90 days written notice", "30 days", "60 days prior written notice". ' +
          'Return null if no termination for convenience right exists or notice period is absent.',
      },
      renewalTerm: {
        type: ['string', 'null'] as unknown as 'string',
        description:
          'Auto-renewal details as a human-readable string covering: renewal duration, ' +
          'and opt-out notice window. Example: "renews annually; 60 days opt-out notice required". ' +
          'Return null if no auto-renewal clause exists.',
      },
      currency: {
        type: 'string',
        enum: ['GBP', 'USD', 'EUR', 'other'],
        description: 'Primary currency used in the contract for fees and financial values.',
      },
    },
    required: [
      'acv',
      'termMonths',
      'insuranceCover',
      'dataType',
      'liabilityCap',
      'governingLaw',
      'terminationNotice',
      'renewalTerm',
      'currency',
    ],
  },
};

const EXTRACTION_SYSTEM_PROMPT =
  'You are a commercial contracts specialist extracting specific numerical and textual values from a SaaS agreement. ' +
  'Extract only what is explicitly stated or directly calculable from the contract text. ' +
  'Do not infer, estimate, or assume values that are not present. ' +
  'Return null for any field you cannot determine with confidence.';

export type AIExtractedValues = {
  acv: number | null;
  termMonths: number | null;
  insuranceCover: number | null;
  dataType: 'standard' | 'personal' | 'sensitive';
  liabilityCap: number | null;
  governingLaw: string | null;
  terminationNotice: string | null;
  renewalTerm: string | null;
  currency: 'GBP' | 'USD' | 'EUR' | 'other';
};

export type AIExtractionUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  costUsd: number;
};

export type AIExtractionResult = {
  values: AIExtractedValues;
  usage: AIExtractionUsage;
};

export async function extractContractValuesWithAI(contractText: string): Promise<AIExtractionResult> {
  const client = new Anthropic();
  const truncated = contractText.slice(0, EXTRACTION_CHAR_LIMIT);

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 512,
    temperature: 0,
    tools: [EXTRACT_VALUES_TOOL],
    // Must call the extraction tool — no text-only responses.
    tool_choice: { type: 'tool', name: 'extract_contract_values' },
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract the commercial and legal metadata from this SaaS contract:\n\n${truncated}`,
      },
    ],
  });

  const toolCall = response.content.find(
    (b): b is Extract<(typeof response.content)[number], { type: 'tool_use' }> =>
      b.type === 'tool_use' && b.name === 'extract_contract_values',
  );

  if (!toolCall) {
    throw new Error('Haiku did not call extract_contract_values');
  }

  const raw = toolCall.input as Record<string, unknown>;
  const u = response.usage;
  const cacheCreation = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const usage: AIExtractionUsage = {
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheCreationTokens: cacheCreation,
    cacheReadTokens: cacheRead,
    costUsd: calculateCostUsd(HAIKU_MODEL, {
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_creation_input_tokens: cacheCreation,
      cache_read_input_tokens: cacheRead,
    }),
  };

  const values: AIExtractedValues = {
    acv: typeof raw.acv === 'number' ? raw.acv : null,
    termMonths: typeof raw.termMonths === 'number' ? Math.round(raw.termMonths) : null,
    insuranceCover: typeof raw.insuranceCover === 'number' ? raw.insuranceCover : null,
    dataType: (['standard', 'personal', 'sensitive'] as const).includes(
      raw.dataType as 'standard' | 'personal' | 'sensitive',
    )
      ? (raw.dataType as 'standard' | 'personal' | 'sensitive')
      : 'standard',
    liabilityCap: typeof raw.liabilityCap === 'number' ? raw.liabilityCap : null,
    governingLaw: typeof raw.governingLaw === 'string' ? raw.governingLaw : null,
    terminationNotice: typeof raw.terminationNotice === 'string' ? raw.terminationNotice : null,
    renewalTerm: typeof raw.renewalTerm === 'string' ? raw.renewalTerm : null,
    currency: (['GBP', 'USD', 'EUR', 'other'] as const).includes(
      raw.currency as 'GBP' | 'USD' | 'EUR' | 'other',
    )
      ? (raw.currency as 'GBP' | 'USD' | 'EUR' | 'other')
      : 'other',
  };

  return { values, usage };
}
