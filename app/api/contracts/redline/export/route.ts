import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { downloadDocx } from '@/lib/supabase-storage';
import { getCurrentSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

// No type declarations available — loaded at runtime via serverExternalPackages
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { setDefaultAuthor, configureXmlProvider } = require('@ansonlai/docx-redline-js') as {
  setDefaultAuthor: (author: string) => void;
  configureXmlProvider: (providers: { DOMParser: unknown; XMLSerializer: unknown }) => void;
};

// applyRedlineToOxml (top-level export) expects paragraph/range/table-scope OOXML and
// its result.oxml shape is not safe to write directly into word/document.xml (per the
// library's own "Output Shape Matrix" — it may return a <pkg:package> payload). We are
// operating on the FULL word/document.xml, so we need the document-level helper instead,
// which locates the target paragraph internally and returns a write-safe <w:document>.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { applyOperationToDocumentXml } = require('@ansonlai/docx-redline-js/services/standalone-operation-runner.js') as {
  applyOperationToDocumentXml: (
    documentXml: string,
    op: { type: 'redline'; target: string; modified: string },
    author: string,
    runtimeContext?: unknown,
    options?: { generateRedlines?: boolean },
  ) => Promise<{ documentXml: string; hasChanges: boolean }>;
};

// docx-redline-js needs a DOM implementation in Node.js — @xmldom/xmldom provides it.
// configureXmlProvider is idempotent so calling it at module scope is safe.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DOMParser, XMLSerializer } = require('@xmldom/xmldom') as {
  DOMParser: new () => DOMParser;
  XMLSerializer: new () => XMLSerializer;
};
configureXmlProvider({ DOMParser, XMLSerializer });

type AcceptedRedline = { clauseText: string; proposedText: string; explanation: string };

const MAX_DOCX_BYTES = 20 * 1024 * 1024; // 20 MB decoded

type RequestBody = {
  acceptedRedlines: Record<string, AcceptedRedline>;
  docxBuffer?: string;
  docxStorageKey?: string;
  fileName: string;
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { acceptedRedlines, docxBuffer, docxStorageKey, fileName } = body;

  if (!acceptedRedlines || Object.keys(acceptedRedlines).length === 0) {
    return NextResponse.json({ error: 'No accepted redlines provided.' }, { status: 400 });
  }

  if (!docxBuffer && !docxStorageKey) {
    return NextResponse.json({ error: 'No DOCX buffer provided.' }, { status: 400 });
  }

  // Reject oversized base64 payloads before decoding (base64 overhead is ~4/3).
  if (docxBuffer && docxBuffer.length > MAX_DOCX_BYTES * 1.4) {
    return NextResponse.json({ error: 'Document exceeds the 20 MB size limit.' }, { status: 413 });
  }

  try {
    // Use the signed-in user's email as the tracked-change author so reviewers
    // see a real identity in Word rather than the generic "Pactora" fallback.
    const session = await getCurrentSessionUser();
    const author = session?.user.email ?? 'Pactora';
    setDefaultAuthor(author);

    // Resolve the DOCX buffer: prefer a Supabase Storage key (set at upload time
    // when Storage is configured); fall back to the inline base64 string that the
    // client stores in sessionStorage for backward compatibility.
    let buffer: Buffer;
    if (docxStorageKey) {
      const downloaded = await downloadDocx(docxStorageKey);
      if (!downloaded) {
        return NextResponse.json(
          { error: 'Could not retrieve the original document. Please re-upload and try again.' },
          { status: 502 },
        );
      }
      buffer = downloaded;
    } else {
      buffer = Buffer.from(docxBuffer!, 'base64');
    }

    // Reject after decoding to catch any padding tricks.
    if (buffer.length > MAX_DOCX_BYTES) {
      return NextResponse.json({ error: 'Document exceeds the 20 MB size limit.' }, { status: 413 });
    }

    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      return NextResponse.json(
        { error: 'Invalid or corrupted document buffer. Please re-upload the original contract.' },
        { status: 400 },
      );
    }
    const zip = await JSZip.loadAsync(buffer);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) throw new Error('word/document.xml not found in DOCX');
    let xml = await xmlFile.async('string');

    // Reject DOCTYPE declarations — @xmldom/xmldom expands entities by default,
    // so a billion-laughs payload in a DTD would OOM the function. Real DOCX
    // files never contain a DOCTYPE in word/document.xml.
    if (/<!DOCTYPE/i.test(xml)) {
      return NextResponse.json(
        { error: 'Invalid or corrupted document buffer. Please re-upload the original contract.' },
        { status: 400 },
      );
    }

    const seenClauseTexts = new Set<string>();
    for (const [clauseType, redline] of Object.entries(acceptedRedlines)) {
      if (!redline.clauseText || !redline.proposedText) continue;
      if (seenClauseTexts.has(redline.clauseText)) {
        console.warn(
          `[redline/export] Overlapping redlines detected for clause type: ${clauseType}. ` +
          `Skipping duplicate to prevent double-wrapped revision markup.`,
        );
        continue;
      }
      seenClauseTexts.add(redline.clauseText);
      const result = await applyOperationToDocumentXml(
        xml,
        { type: 'redline', target: redline.clauseText, modified: redline.proposedText },
        author,
        null,
        { generateRedlines: true },
      );
      if (!result.hasChanges) {
        console.warn(`[redline/export] Could not locate clause text for "${clauseType}" in the document; that redline was skipped.`);
      }
      xml = result.documentXml;
    }

    // Validate output XML before writing — @xmldom/xmldom embeds parse errors as
    // <parsererror> elements rather than throwing, so we check both paths.
    let parsedXml: Document;
    try {
      parsedXml = new DOMParser().parseFromString(xml, 'text/xml');
    } catch (parseErr) {
      console.error('[redline/export] XML validation failed after redline application:', parseErr);
      return NextResponse.json(
        { error: 'Failed to generate valid DOCX. Please try again or contact support.' },
        { status: 500 },
      );
    }
    const parseErrors = parsedXml.getElementsByTagName('parsererror');
    if (parseErrors.length > 0) {
      console.error('[redline/export] XML validation failed after redline application:', parseErrors[0]?.textContent);
      return NextResponse.json(
        { error: 'Failed to generate valid DOCX. Please try again or contact support.' },
        { status: 500 },
      );
    }

    zip.file('word/document.xml', xml);
    const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    const baseName = (fileName ?? 'contract').replace(/\.[^.]+$/, '');

    return new NextResponse(outputBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${baseName}-redlined.docx"`,
      },
    });
  } catch (err) {
    console.error('[redline/export] DOCX generation failed:', err);
    return NextResponse.json({ error: 'Unable to generate redlined DOCX.' }, { status: 500 });
  }
}
