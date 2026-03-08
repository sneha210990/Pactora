import { NextResponse } from 'next/server';
import { detectContractValues, extractContractText } from '@/lib/contract-extraction';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploaded = formData.get('contract');

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: 'No contract file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await uploaded.arrayBuffer());
    const text = await extractContractText(uploaded.name, buffer);
    const detectedValues = detectContractValues(text);

    return NextResponse.json({ detectedValues });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to extract contract values.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
