import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const maxDuration = 30;

// No type declarations available — loaded at runtime via serverExternalPackages
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { applyRedlineToOxml, setDefaultAuthor } = require('@ansonlai/docx-redline-js') as {
  applyRedlineToOxml: (xml: string, original: string, proposed: string, options?: Record<string, unknown>) => Promise<{ oxml?: string } | string>;
  setDefaultAuthor: (author: string) => void;
};

type AcceptedRedline = { clauseText: string; proposedText: string; explanation: string };

type RequestBody = {
  acceptedRedlines: Record<string, AcceptedRedline>;
  docxBuffer?: string;
  fileName: string;
};

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { acceptedRedlines, docxBuffer, fileName } = body;

  if (!acceptedRedlines || Object.keys(acceptedRedlines).length === 0) {
    return NextResponse.json({ error: 'No accepted redlines provided.' }, { status: 400 });
  }

  if (!docxBuffer) {
    return NextResponse.json({ error: 'No DOCX buffer provided.' }, { status: 400 });
  }

  try {
    setDefaultAuthor('Pactora');
    const buffer = Buffer.from(docxBuffer, 'base64');
    const zip = await JSZip.loadAsync(buffer);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) throw new Error('word/document.xml not found in DOCX');
    let xml = await xmlFile.async('string');

    for (const [, redline] of Object.entries(acceptedRedlines)) {
      if (!redline.clauseText || !redline.proposedText) continue;
      const result = await applyRedlineToOxml(xml, redline.clauseText, redline.proposedText, {
        generateRedlines: true,
      });
      if (result && typeof result === 'object' && typeof result.oxml === 'string') {
        xml = result.oxml;
      } else if (typeof result === 'string') {
        xml = result;
      }
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
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[redline/export] DOCX generation failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
