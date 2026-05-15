import { NextResponse } from 'next/server';
import { detectContractValues, extractContractText } from '@/lib/contract-extraction';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_MANUAL_TEXT_LENGTH = 20;

function extractTerm(pattern: RegExp, text: string) {
  return text.match(pattern)?.[1]?.trim();
}

function detectCanonicalTerms(text: string) {
  return {
    effectiveDate: extractTerm(/effective date[:\s]+([^\n.;]+)/i, text),
    governingLaw: extractTerm(/governed by (?:and construed in accordance with )?(?:the laws of )?([^\n.;]+)/i, text),
    terminationNotice: extractTerm(/(\d+\s+(?:days?|months?)['’]?\s+(?:prior\s+)?(?:written\s+)?notice)/i, text),
    renewalTerm: extractTerm(/renew(?:s|al)?[^\n.]*?(\d+\s+(?:days?|months?|years?))/i, text),
  };
}

type ManualExtractionRequest = {
  text?: unknown;
  sourceName?: unknown;
};

function buildExtractionPayload(
  text: string,
  documentMeta: { fileName: string; fileType: string; uploadedAt: string },
) {
  const detectedValues = detectContractValues(text);
  const extractedTerms = detectCanonicalTerms(text);
  const documentId = crypto.randomUUID();

  console.log('[extract] parser payload shape:', {
    documentId: typeof documentId,
    detectedValues: Object.keys(detectedValues),
    extractedTerms: Object.keys(extractedTerms).filter((key) => Boolean(extractedTerms[key as keyof typeof extractedTerms])),
    contractTextLength: text.length,
    source: documentMeta.fileType,
  });

  return {
    documentId,
    detectedValues,
    extractedTerms,
    documentMeta,
    contractText: text,
  };
}

async function extractFromManualText(request: Request) {
  const body = (await request.json()) as ManualExtractionRequest;
  const text = typeof body.text === 'string' ? body.text.replace(/\r\n?/g, '\n').trim() : '';

  if (text.length < MIN_MANUAL_TEXT_LENGTH) {
    return NextResponse.json(
      { error: 'Please paste at least 20 characters of contract clauses.' },
      { status: 400 },
    );
  }

  const sourceName = typeof body.sourceName === 'string' && body.sourceName.trim()
    ? body.sourceName.trim()
    : 'Pasted contract clauses';

  console.log('[extract] manualText.length:', text.length);

  return NextResponse.json(buildExtractionPayload(text, {
    fileName: sourceName,
    fileType: 'text/plain',
    uploadedAt: new Date().toISOString(),
  }));
}

async function extractFromUploadedFile(request: Request) {
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

  console.log('[extract] file.name:', uploaded.name);
  console.log('[extract] file.type:', uploaded.type);
  console.log('[extract] file.size:', uploaded.size, 'bytes');

  const buffer = Buffer.from(await uploaded.arrayBuffer());
  const text = await extractContractText(uploaded.name, buffer, uploaded.type);

  return NextResponse.json(buildExtractionPayload(text, {
    fileName: uploaded.name,
    fileType: uploaded.type,
    uploadedAt: new Date().toISOString(),
  }));
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';

    if (contentType.includes('application/json')) {
      return await extractFromManualText(request);
    }

    return await extractFromUploadedFile(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to extract contract values.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
