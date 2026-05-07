import { NextResponse } from 'next/server';
import { analyzeContractClauses } from '@/lib/clause-analysis';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: unknown };

    if (typeof body.text !== 'string' || body.text.trim().length < 20) {
      return NextResponse.json({ error: 'Contract text is required.' }, { status: 400 });
    }

    const analysis = await analyzeContractClauses(body.text);
    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to analyse contract.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
