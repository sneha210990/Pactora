// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2025 Pactora Ltd <legal@pactora.co>
import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { recordApiUsage, recordAuditEvent } from '@/lib/beta-store';
import { extractContractText } from '@/lib/contract-extraction';
import { buildExtractionPayload } from '@/lib/contract-extraction';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ANON_FREE_USES = 1;
const ANON_COOKIE = 'pactora_anon_uses';

async function extractFromManualText(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400 });
  }

  const text = 'text' in body && typeof (body as Record<string, unknown>).text === 'string'
    ? ((body as Record<string, unknown>).text as string).trim()
    : '';

  if (!text) {
    return NextResponse.json({ error: 'No contract text provided.' }, { status: 400 });
  }

  if (text.length > 500_000) {
    return NextResponse.json(
      { error: 'Contract text is too long. Please paste under 500,000 characters.' },
      { status: 413 },
    );
  }

  const sourceName = typeof body === 'object' && body !== null && 'sourceName' in body && typeof (body as Record<string, unknown>).sourceName === 'string' && ((body as Record<string, unknown>).sourceName as string).trim()
    ? ((body as Record<string, unknown>).sourceName as string).trim()
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
