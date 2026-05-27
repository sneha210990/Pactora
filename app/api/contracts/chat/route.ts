import { NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/agents/client';
import type Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SONNET = 'claude-sonnet-4-6';
const MAX_TOKENS = 1_500;
const MAX_CONTRACT_CHARS = 80_000;
const MAX_HISTORY_TURNS = 10;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type RequestBody = {
  messages?: unknown;
  contractText?: unknown;
};

const SYSTEM_PROMPT = `You are a specialist legal and commercial contract reviewer integrated into Pactora, a contract risk analysis platform. The user has uploaded and analysed a contract. Your role is to answer follow-up questions about specific clauses, risks, and negotiation strategies based on the contract text provided.

Rules:
- Answer only questions about the uploaded contract. If asked something unrelated, politely redirect.
- Be specific: quote or reference actual clause language when it helps.
- When uncertain, say so — do not invent facts not present in the contract.
- Keep responses practical and concise. The user is a founder or commercial professional, not a lawyer.
- When suggesting alternative language, mark it clearly as a starting point for negotiation, not legal advice.`;

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const contractText = typeof body.contractText === 'string' ? body.contractText.trim() : '';
  if (!contractText) {
    return NextResponse.json({ error: 'contractText is required.' }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required.' }, { status: 400 });
  }

  const raw = body.messages as ChatMessage[];
  const lastMessage = raw[raw.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
    return NextResponse.json({ error: 'Last message must be a non-empty user message.' }, { status: 400 });
  }

  // Cap contract text and history to stay within context limits
  const truncatedContract = contractText.slice(0, MAX_CONTRACT_CHARS);
  const history = raw.slice(-MAX_HISTORY_TURNS);

  // Build Anthropic messages. Contract text is placed as a cached prefix on the
  // first user turn so the 2nd–Nth exchanges pay 10% input cost for the contract.
  const [first, ...rest] = history;
  const anthropicMessages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `<contract>\n${truncatedContract}\n</contract>\n\n${first.content}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
    },
    ...rest.map((msg) => ({
      role: msg.role,
      content: msg.content,
    })),
  ];

  const client = getAnthropicClient();

  try {
    const stream = await client.messages.create({
      model: SONNET,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: anthropicMessages,
      stream: true,
    });

    const readable = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('[chat] Anthropic error:', err);
    return NextResponse.json({ error: 'Unable to generate response.' }, { status: 500 });
  }
}
