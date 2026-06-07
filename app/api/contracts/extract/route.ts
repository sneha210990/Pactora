import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { detectContractValues, extractContractText } from '@/lib/contract-extraction';
import { extractContractValuesWithAI } from '@/lib/ai-extraction';
import { recordApiUsage, recordAuditEvent } from '@/lib/beta-store';
import { getCurrentSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_MANUAL_TEXT_LENGTH = 20;
const ANON_FREE_USES = 1;
const ANON_COOKIE = 'pactora_anon_uses';

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

// Runs AI extraction (Haiku) and regex extraction in parallel.
// AI values win when present; regex provides the fallback.
// If AI fails entirely, the function returns regex-only results — the product
// always delivers something, never an error because of AI unavailability.
async function mergeExtractionValues(text: string) {
  const regexValues = detectContractValues(text);
  const regexTerms = detectCanonicalTerms(text);

  // Fire Haiku in parallel with the (already-completed) regex pass.
  const aiResult = await extractContractValuesWithAI(text).catch((err: unknown) => {
    console.warn('[extract] Haiku extraction failed, using regex fallback:', err instanceof Error ? err.message : err);
    return null;
  });

  // Record usage asynchronously — do not block the extraction response.
  if (aiResult) {
    recordApiUsage({
      operation: 'extraction',
      model: 'claude-haiku-4-5-20251001',
      input_tokens: aiResult.usage.inputTokens,
      output_tokens: aiResult.usage.outputTokens,
      cache_creation_tokens: aiResult.usage.cacheCreationTokens,
      cache_read_tokens: aiResult.usage.cacheReadTokens,
      cost_usd: aiResult.usage.costUsd,
    }).catch(console.error);
  }

  const ai = aiResult?.values ?? null;

  const detectedValues = {
    // Numeric fields: AI wins on any non-null value; regex serves as fallback.
    acv: ai?.acv ?? regexValues.acv,
    termMonths: ai?.termMonths ?? regexValues.termMonths,
    insuranceCover: ai?.insuranceCover ?? regexValues.insuranceCover,
    // dataType: AI wins — it understands GDPR context better than keyword matching.
    dataType: ai?.dataType ?? regexValues.dataType,
    // liabilityCap: AI-only field; regex has no equivalent.
    liabilityCap: ai?.liabilityCap ?? null,
    // currency: AI-only field.
    currency: ai?.currency ?? ('GBP' as const),
  };

  const extractedTerms = {
    effectiveDate: regexTerms.effectiveDate ?? undefined,
    // AI wins on governing law and termination notice (more context-aware than regex).
    governingLaw: ai?.governingLaw ?? regexTerms.governingLaw ?? undefined,
    terminationNotice: ai?.terminationNotice ?? regexTerms.terminationNotice ?? undefined,
    renewalTerm: ai?.renewalTerm ?? regexTerms.renewalTerm ?? undefined,
  };

  console.log('[extract] extraction sources:', {
    acv: ai?.acv != null ? 'ai' : regexValues.acv != null ? 'regex' : 'null',
    termMonths: ai?.termMonths != null ? 'ai' : regexValues.termMonths != null ? 'regex' : 'null',
    insuranceCover: ai?.insuranceCover != null ? 'ai' : regexValues.insuranceCover != null ? 'regex' : 'null',
    dataType: ai?.dataType != null ? 'ai' : 'regex',
    liabilityCap: ai?.liabilityCap != null ? 'ai' : 'null',
    governingLaw: ai?.governingLaw != null ? 'ai' : regexTerms.governingLaw != null ? 'regex' : 'null',
    terminationNotice: ai?.terminationNotice != null ? 'ai' : regexTerms.terminationNotice != null ? 'regex' : 'null',
    aiAvailable: aiResult !== null,
  });

  return { detectedValues, extractedTerms };
}

async function buildExtractionPayload(
  text: string,
  documentMeta: { fileName: string; fileType: string; uploadedAt: string },
) {
  const { detectedValues, extractedTerms } = await mergeExtractionValues(text);
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

  const documentMeta = { fileName: sourceName, fileType: 'text/plain', uploadedAt: new Date().toISOString() };
  const payload = await buildExtractionPayload(text, documentMeta);

  getCurrentSessionUser()
    .then((s) => recordAuditEvent({
      user_id: s?.user.auth_user_id ?? s?.user.id ?? null,
      action: 'contract_extracted',
      document_id: payload.documentId,
      metadata: { file_name: documentMeta.fileName, file_type: documentMeta.fileType },
    }))
    .catch(console.error);

  return NextResponse.json(payload);
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
  const { text, visionUsage } = await extractContractText(uploaded.name, buffer, uploaded.type);

  if (visionUsage) {
    recordApiUsage({
      operation: 'extraction',
      model: 'claude-sonnet-4-6',
      input_tokens: visionUsage.inputTokens,
      output_tokens: visionUsage.outputTokens,
      cache_creation_tokens: visionUsage.cacheCreationTokens,
      cache_read_tokens: visionUsage.cacheReadTokens,
      cost_usd: visionUsage.costUsd,
    }).catch(console.error);
  }

  const uploadedAt = new Date().toISOString();
  const payload = await buildExtractionPayload(text, {
    fileName: uploaded.name,
    fileType: uploaded.type,
    uploadedAt,
  });

  const isDocx =
    uploaded.name.toLowerCase().endsWith('.docx') ||
    uploaded.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  getCurrentSessionUser()
    .then((s) => recordAuditEvent({
      user_id: s?.user.auth_user_id ?? s?.user.id ?? null,
      action: 'contract_extracted',
      document_id: payload.documentId,
      metadata: {
        file_name: uploaded.name,
        file_type: uploaded.type,
        source_type: isDocx ? 'docx' : 'pdf',
        vision_used: visionUsage != null,
      },
    }))
    .catch(console.error);

  return NextResponse.json({
    ...payload,
    sourceFileType: isDocx ? 'docx' : 'pdf',
    ...(isDocx && { docxBuffer: buffer.toString('base64') }),
  });
}

export async function POST(request: Request) {
  try {
    // Usage gate: unauthenticated users get ANON_FREE_USES free analyses.
    const session = await getCurrentSessionUser();

    if (!session) {
      const cookieStore = await cookies();
      const used = parseInt(cookieStore.get(ANON_COOKIE)?.value ?? '0', 10);
      if (used >= ANON_FREE_USES) {
        return NextResponse.json({ error: 'free_limit_reached' }, { status: 402 });
      }
    }

    const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
    // The counter is incremented by analyze-agents (the expensive step), not here.
    // Extract only checks so that the first session's extract + analyze pair both succeed.
    return contentType.includes('application/json')
      ? extractFromManualText(request)
      : extractFromUploadedFile(request);
  } catch (error) {
    console.error('[extract] error:', error);
    return NextResponse.json({ error: 'Unable to extract contract values.' }, { status: 400 });
  }
}
