import { NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/agents/client';
import type { ClauseFlag } from '@/lib/clause-analysis';

export const runtime = 'nodejs';
export const maxDuration = 60;

type CommercialContext = {
  acv?: number;
  termMonths?: number;
  insuranceCover?: number;
  dataType?: string;
  liabilityCap?: number;
};

type RequestBody = {
  flags?: unknown;
  commercialContext?: unknown;
};

const SYSTEM_PROMPT = `You are a commercial contracts lawyer drafting a negotiation email on behalf of a startup or scaleup buyer.

You will receive a list of flagged contract risks, each with a risk level (High, Medium, or Low), a plain-English explanation, and a suggested negotiation point. You may also receive commercial context such as the annual contract value (ACV), contract term, liability cap, and data type.

Write a professional negotiation email from the buyer to the vendor's legal or commercial team. Follow these rules exactly:

1. Open with a short executive summary paragraph (2-3 sentences) acknowledging the contract review and signalling that the buyer has identified points to discuss before signature. Do not be combative.
2. List negotiation asks in priority order: High risk issues first, then Medium, then Low. Number each ask.
3. For each ask: name the clause type, describe the concern in one sentence, state the specific ask, and where helpful note an acceptable fallback.
4. Use concrete language. Reference actual clause concerns, not generic platitudes.
5. Close with one short paragraph expressing willingness to discuss on a call and move towards signature.
6. Sign off as: "Kind regards, [Buyer Legal / Commercial Team]"

Use commercial English. Be direct but collaborative — this is a negotiation, not a dispute.

Return only the email body. No markdown. No JSON. No preamble. No meta-commentary. Just the text of the email, ready to paste and send.`;

function formatContext(ctx: CommercialContext): string {
  const parts: string[] = [];
  if (ctx.acv) parts.push(`ACV: £${ctx.acv.toLocaleString('en-GB')}`);
  if (ctx.termMonths) parts.push(`Term: ${ctx.termMonths} months`);
  if (ctx.liabilityCap) parts.push(`Liability cap: £${ctx.liabilityCap.toLocaleString('en-GB')}`);
  if (ctx.insuranceCover) parts.push(`Insurance cover: £${ctx.insuranceCover.toLocaleString('en-GB')}`);
  if (ctx.dataType) parts.push(`Data type: ${ctx.dataType}`);
  return parts.length > 0 ? `Commercial context: ${parts.join(' | ')}\n\n` : '';
}

function formatFlags(flags: ClauseFlag[]): string {
  const rank: Record<ClauseFlag['riskLevel'], number> = { High: 0, Medium: 1, Low: 2 };
  const ordered = [...flags].sort((a, b) => rank[a.riskLevel] - rank[b.riskLevel]);

  return ordered
    .map(
      (f) =>
        `Clause type: ${f.clauseType}\nRisk level: ${f.riskLevel}\nRisk explanation: ${f.plainEnglish}\nSuggested ask: ${f.negotiationPoint}`,
    )
    .join('\n\n---\n\n');
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!Array.isArray(body.flags) || body.flags.length === 0) {
    return NextResponse.json({ error: 'At least one clause flag is required.' }, { status: 400 });
  }

  const flags = body.flags as ClauseFlag[];
  const commercialContext = (body.commercialContext ?? {}) as CommercialContext;

  const userMessage = `${formatContext(commercialContext)}The following contract risks have been identified:\n\n${formatFlags(flags)}\n\nPlease draft the negotiation email.`;

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
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

    return NextResponse.json({ email: textBlock.text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
