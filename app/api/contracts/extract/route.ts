import { NextResponse } from 'next/server';
import { detectContractValues, extractContractText } from '@/lib/contract-extraction';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploaded = formData.get('contract');

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: 'No contract file uploaded.' }, { status: 400 });
    }

    if (uploaded.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File is too large. Please upload a contract under 20 MB.' },
        { status: 413 },
      );
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
