import { NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/agents/client';

export const runtime = 'nodejs';
export const maxDuration = 30;

type RequestBody = {
  clauseText?: string;
  clauseType?: string;
  acv?: number | null;
  liabilityCap?: number | null;
};

const SYSTEM_PROMPT = `You are a commercial contracts lawyer advising a SaaS buyer. You will be given a contract clause that has been flagged as risky, the clause type, and optionally the annual contract value (ACV) and current liability cap.

Your task: propose concise alternative clause language the buyer should put forward in negotiation.

Rules:
1. Write actual contract language — not a description of what to change, but the replacement text itself.
2. Keep it to 2–4 sentences. Match the register of the original clause.
3. Make it a realistic ask — buyer-protective but not so aggressive the vendor walks away.
4. Where ACV or a liability cap figure is provided, use the specific amounts.
5. For a Liability Cap clause: propose a minimum cap of 12× monthly fees (equivalent to 1× ACV). If the current cap is below 1× ACV, propose 1× ACV. Also propose mutual application.
6. For an Indemnity clause: narrow the scope to direct, proven losses; add mutual indemnification; cap the indemnity at the same level as the liability cap.
7. After the proposed language, add one short line starting "Why this works:" explaining in plain English what the change achieves for the buyer.

Return only the proposed language and the "Why this works:" line. No JSON. No markdown. No preamble.`;

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body.clauseText && !body.clauseType) {
    return NextResponse.json({ error: 'clauseText or clauseType is required.' }, { status: 400 });
  }

  const parts: string[] = [];
  if (body.clauseType) parts.push(`Clause type: ${body.clauseType}`);
  if (body.acv != null) parts.push(`ACV: £${body.acv.toLocaleString('en-GB')}`);
  if (body.liabilityCap != null) parts.push(`Current liability cap: £${body.liabilityCap.toLocaleString('en-GB')}`);
  if (body.clauseText) parts.push(`\nOriginal clause text:\n${body.clauseText}`);

  const userMessage = parts.join('\n') + '\n\nPlease suggest alternative language.';

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from Claude.' }, { status: 500 });
    }

    return NextResponse.json({ alternative: textBlock.text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
