import { NextResponse } from 'next/server';
import { extractContractText } from '@/lib/contract-extraction';
import { runIntegrityEngine, type ContractDocumentKind, type ContractInput } from '@/lib/integrity-engine';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_DOCUMENTS = 25;

type JsonDocumentInput = {
  id?: unknown;
  title?: unknown;
  kind?: unknown;
  text?: unknown;
};

function isContractKind(value: unknown): value is ContractDocumentKind {
  return (
    value === 'msa' ||
    value === 'sow' ||
    value === 'dpa' ||
    value === 'order_form' ||
    value === 'schedule' ||
    value === 'annex' ||
    value === 'exhibit' ||
    value === 'unknown'
  );
}

function normalizeJsonDocument(document: JsonDocumentInput, index: number): ContractInput {
  if (typeof document.text !== 'string' || document.text.trim().length < 20) {
    throw new Error(`documents[${index}].text must contain at least 20 characters.`);
  }

  return {
    id: typeof document.id === 'string' ? document.id : undefined,
    title: typeof document.title === 'string' ? document.title : undefined,
    kind: isContractKind(document.kind) ? document.kind : undefined,
    text: document.text,
  };
}

async function inputsFromJson(request: Request): Promise<ContractInput[]> {
  const body = (await request.json()) as { documents?: unknown; text?: unknown; title?: unknown; kind?: unknown };

  if (Array.isArray(body.documents)) {
    return body.documents.map((document, index) => normalizeJsonDocument(document as JsonDocumentInput, index));
  }

  if (typeof body.text === 'string') {
    return [normalizeJsonDocument({ text: body.text, title: body.title, kind: body.kind }, 0)];
  }

  throw new Error('Provide either { documents: [{ text, title?, kind? }] } or { text }.');
}

async function inputsFromMultipart(request: Request): Promise<ContractInput[]> {
  const formData = await request.formData();
  const files = formData.getAll('contracts').filter((value): value is File => value instanceof File);
  const fallbackSingleFile = formData.get('contract');
  if (fallbackSingleFile instanceof File) files.push(fallbackSingleFile);

  if (files.length === 0) {
    throw new Error('No contract files uploaded. Use the contracts field for one or more PDF/DOCX/DOC files.');
  }

  if (files.length > MAX_DOCUMENTS) {
    throw new Error(`Upload no more than ${MAX_DOCUMENTS} documents per integrity run.`);
  }

  const inputs: ContractInput[] = [];
  for (const [index, file] of files.entries()) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`${file.name} is too large. Please upload documents under 20 MB each.`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractContractText(file.name, buffer, file.type);
    const explicitKind = formData.get(`kind_${index}`);
    inputs.push({
      id: `upload-${index + 1}`,
      title: file.name,
      kind: isContractKind(explicitKind) ? explicitKind : undefined,
      text,
    });
  }

  return inputs;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    const inputs = contentType.includes('multipart/form-data')
      ? await inputsFromMultipart(request)
      : await inputsFromJson(request);

    if (inputs.length === 0) {
      return NextResponse.json({ error: 'At least one contract is required.' }, { status: 400 });
    }

    if (inputs.length > MAX_DOCUMENTS) {
      return NextResponse.json(
        { error: `Run integrity checks on no more than ${MAX_DOCUMENTS} documents at a time.` },
        { status: 413 },
      );
    }

    const report = runIntegrityEngine(inputs);
    return NextResponse.json({ report });
  } catch (error) {
    console.error('[integrity] error:', error);
    return NextResponse.json({ error: 'Unable to run integrity checks.' }, { status: 400 });
  }
}
