import { getAnthropicClient } from './client';

export const CONTRACT_TYPES = ['SaaS', 'NDA', 'Employment', 'SupplyChain', 'ProfessionalServices', 'Other'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

const HAIKU = 'claude-haiku-4-5-20251001';
const CLASSIFY_TEXT_LIMIT = 40_000;

const CONTRACT_TYPE_TOOL = {
  name: 'report_contract_type',
  description: 'Report the type of contract being reviewed.',
  input_schema: {
    type: 'object' as const,
    properties: {
      contractType: {
        type: 'string',
        enum: [...CONTRACT_TYPES],
        description: 'The primary contract type. Choose the most specific match.',
      },
    },
    required: ['contractType'],
  },
};

const SYSTEM = `You are a contract classification assistant. Identify the primary type of the contract provided.

SaaS — software subscription, licence, or cloud service agreement
NDA — non-disclosure or confidentiality agreement
Employment — employment, contractor, or consultancy agreement
SupplyChain — goods supply, procurement, or manufacturing agreement
ProfessionalServices — professional services, SOW, or agency agreement
Other — any other type

Choose the single best match.`;

export async function classifyContractType(contractText: string): Promise<ContractType> {
  const client = getAnthropicClient();
  const text = contractText.slice(0, CLASSIFY_TEXT_LIMIT);

  try {
    const response = await client.messages.create({
      model: HAIKU,
      max_tokens: 64,
      temperature: 0,
      tools: [CONTRACT_TYPE_TOOL],
      tool_choice: { type: 'any' },
      system: SYSTEM,
      messages: [{ role: 'user', content: `Classify this contract:\n\n${text}` }],
    });

    const toolCall = response.content.find((b) => b.type === 'tool_use');
    if (toolCall?.type === 'tool_use' && toolCall.name === 'report_contract_type') {
      const input = toolCall.input as { contractType?: string };
      if (input.contractType && (CONTRACT_TYPES as readonly string[]).includes(input.contractType)) {
        const detected = input.contractType as ContractType;
        console.log(`[CONTRACT_TYPE] Detected: ${detected}`);
        return detected;
      }
    }
  } catch (err) {
    console.warn('[CONTRACT_TYPE] Classification failed — defaulting to SaaS:', err instanceof Error ? err.message : err);
  }

  return 'SaaS';
}
