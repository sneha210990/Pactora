import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAnthropicClient } from '@/lib/agents/client';
import { calculateCostUsd } from '@/lib/agents/api-cost';
import { recordApiUsage, recordAuditEvent } from '@/lib/beta-store';
import { getCurrentSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

type RequestBody = {
  clauseText?: string;
  clauseType?: string;
  acv?: number | null;
  liabilityCap?: number | null;
  contractSide?: 'supplier' | 'buyer' | null;
};

const THINKING_CLAUSE_TYPES = new Set(['IP Ownership', 'Indemnities']);

// Same anonymous-use gate as /api/contracts/analyze-agents — this endpoint can
// also invoke Sonnet + extended thinking and was previously reachable with no
// cap at all.
const ANON_COOKIE = 'pactora_anon_uses';
const ANON_FREE_USES = 999;

// A single extracted clause is never legitimately this long — caps prompt
// size (and cost) regardless of what a caller sends as clauseText.
const MAX_CLAUSE_TEXT_LENGTH = 20_000;

const BUYER_SYSTEM_PROMPT = `You are a commercial contracts lawyer advising a SaaS buyer. You will be given a contract clause that has been flagged as risky, the clause type, and optionally the annual contract value (ACV) and current liability cap.

Your task: propose concise alternative clause language the buyer should put forward in negotiation.

Rules:
1. Write actual contract language — not a description of what to change, but the replacement text itself.
2. Keep it to 2–4 sentences. Match the register of the original clause.
3. Make it a realistic ask — buyer-protective but not so aggressive the vendor walks away.
4. Where ACV or a liability cap figure is provided, use the specific amounts.
5. For a Liability Cap clause: propose a minimum cap of 12× monthly fees (equivalent to 1× ACV). If the current cap is below 1× ACV, propose 1× ACV. Also propose mutual application of the cap.
6. For an Indemnity clause: narrow the scope to direct, proven losses only; add mutual indemnification; cap the indemnity at the same level as the liability cap. Remove any "notwithstanding" language that overrides the cap.
7. For an IP Ownership clause: if the clause assigns IP to the vendor, push for customer ownership of all custom deliverables and bespoke development work, with the vendor retaining a licence to reuse generic tools and methodologies. If full ownership is not achievable, propose a perpetual, irrevocable, royalty-free licence to the customer for all deliverables. Always include an explicit carve-out protecting each party's pre-existing background IP.
8. For a Data Protection clause: specify a maximum 72-hour breach notification window (aligned with GDPR); make the vendor fully liable for its sub-processors; state that data protection liability sits outside the main liability cap; add a post-termination obligation for the vendor to return or destroy all customer personal data within 30 days.
9. For a Termination clause: ensure mutual termination for convenience on 30–90 days written notice; add a cure period of at least 14 days for material breach before termination for cause; include a post-termination transition assistance obligation on the vendor for 60 days; specify that the vendor must return or destroy all customer data within 30 days of termination.

After the proposed language, add one short line starting "Why this works:" explaining in plain English what the change achieves for the buyer.

Return only the proposed language and the "Why this works:" line. No JSON. No markdown. No preamble.`;

const SUPPLIER_SYSTEM_PROMPT = `You are a commercial contracts lawyer advising a SaaS supplier / service provider. You will be given a contract clause that has been flagged as risky to the supplier, the clause type, and optionally the annual contract value (ACV) and current liability cap.

Your task: propose concise alternative clause language the supplier should put forward in negotiation to protect their position.

Rules:
1. Write actual contract language — not a description of what to change, but the replacement text itself.
2. Keep it to 2–4 sentences. Match the register of the original clause.
3. Make it a realistic ask — supplier-protective but not so aggressive the customer walks away.
4. Where ACV or a liability cap figure is provided, use the specific amounts.
5. For a Liability Cap clause: ensure a mutual liability cap exists protecting the supplier. If there is no cap, propose one at 1× ACV for both parties. Narrow any carve-outs to the minimum standard set: death/personal injury, fraud, wilful misconduct. Resist carve-outs for "any confidentiality breach" or "any data breach" that would swallow the cap.
6. For an Indemnity clause: remove or narrow any "notwithstanding any other provision" language that bypasses the liability cap. Narrow the trigger to the supplier's direct breach, fraud, or proven IP infringement only. Add a reciprocal buyer indemnity for buyer's data, content, and instructions. Ensure the supplier retains co-control of any defence.
7. For an IP Ownership clause: carve out the supplier's background IP, pre-existing tools, methodologies, and platform from any assignment. Where custom deliverables are assigned to the customer, add a licence-back to the supplier to use the underlying tools and know-how in future engagements. Limit work-for-hire to specifically commissioned bespoke deliverables only.
8. For a Data Protection clause: confirm the supplier is designated as Processor (not Controller); set the breach notification window at 72 hours to align with GDPR; add a reasonable sub-processor liability cap (limited to losses directly caused by the supplier's failure to vet the sub-processor); ensure data protection liability is subject to the main liability cap or a defined sublimit.
9. For a Termination clause: require at least 90 days written notice for buyer termination for convenience; include an obligation for the buyer to pay all fees accrued, work in progress, and a reasonable kill-fee on early termination; give the supplier the right to suspend and terminate for non-payment after 14 days' notice; ensure transition assistance is compensated at standard day rates.

After the proposed language, add one short line starting "Why this works:" explaining in plain English what the change achieves for the supplier.

Return only the proposed language and the "Why this works:" line. No JSON. No markdown. No preamble.`;

function getSystemPrompt(contractSide?: 'supplier' | 'buyer' | null): string {
  return contractSide === 'supplier' ? SUPPLIER_SYSTEM_PROMPT : BUYER_SYSTEM_PROMPT;
}

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

  // Usage gate: unauthenticated callers get ANON_FREE_USES free redline suggestions,
  // same mechanism as /api/contracts/analyze-agents.
  const session = await getCurrentSessionUser();
  let anonSetCookieHeader: string | null = null;

  if (!session) {
    const cookieStore = await cookies();
    const used = parseInt(cookieStore.get(ANON_COOKIE)?.value ?? '0', 10);
    if (used >= ANON_FREE_USES) {
      return NextResponse.json({ error: 'free_limit_reached' }, { status: 402 });
    }
    const maxAge = 30 * 24 * 60 * 60;
    anonSetCookieHeader = `${ANON_COOKIE}=${used + 1}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax`;
  }

  const contractSide: 'supplier' | 'buyer' | null =
    body.contractSide === 'supplier' || body.contractSide === 'buyer' ? body.contractSide : null;

  const clauseText = body.clauseText?.slice(0, MAX_CLAUSE_TEXT_LENGTH);

  const parts: string[] = [];
  if (body.clauseType) parts.push(`Clause type: ${body.clauseType}`);
  if (body.acv != null) parts.push(`ACV: £${body.acv.toLocaleString('en-GB')}`);
  if (body.liabilityCap != null) parts.push(`Current liability cap: £${body.liabilityCap.toLocaleString('en-GB')}`);
  if (clauseText) parts.push(`\nOriginal clause text:\n${clauseText}`);

  const userMessage = parts.join('\n') + '\n\nPlease suggest alternative language.';

  const useThinking = THINKING_CLAUSE_TYPES.has(body.clauseType ?? '');
  const model = useThinking ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  try {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model,
      max_tokens: useThinking ? 4000 : 600,
      ...(useThinking
        ? { thinking: { type: 'enabled' as const, budget_tokens: 1500 } }
        : { temperature: 0 }),
      system: [
        {
          type: 'text',
          text: getSystemPrompt(contractSide),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No response from Claude.' }, { status: 500 });
    }

    recordAuditEvent({
      user_id: session?.user.auth_user_id ?? session?.user.id ?? null,
      action: 'redline_generated',
      document_id: null,
      metadata: { clause_type: body.clauseType ?? null },
    }).catch(console.error);

    const u = response.usage;
    recordApiUsage({
      operation: 'redline_suggestion',
      model,
      input_tokens: u.input_tokens,
      output_tokens: u.output_tokens,
      cache_creation_tokens: u.cache_creation_input_tokens ?? 0,
      cache_read_tokens: u.cache_read_input_tokens ?? 0,
      cost_usd: calculateCostUsd(model, {
        input_tokens: u.input_tokens,
        output_tokens: u.output_tokens,
        cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
      }),
    }).catch(console.error);

    const res = NextResponse.json({ alternative: textBlock.text.trim() });
    if (anonSetCookieHeader) res.headers.set('Set-Cookie', anonSetCookieHeader);
    return res;
  } catch (err) {
    console.error('[redline] error:', err);
    return NextResponse.json({ error: 'Unable to generate redline suggestion.' }, { status: 500 });
  }
}
