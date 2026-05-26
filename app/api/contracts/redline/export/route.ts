import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export const runtime = 'nodejs';
export const maxDuration = 30;

// No type declarations available — loaded at runtime via serverExternalPackages
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { applyRedlineToOxml, setDefaultAuthor, configureXmlProvider } = require('@ansonlai/docx-redline-js') as {
  applyRedlineToOxml: (xml: string, original: string, proposed: string, options?: Record<string, unknown>) => Promise<{ oxml?: string } | string>;
  setDefaultAuthor: (author: string) => void;
  configureXmlProvider: (providers: { DOMParser: unknown; XMLSerializer: unknown }) => void;
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
      const result = await applyRedlineToOxml(xml, redline.clauseText, redline.proposedText, {
        generateRedlines: true,
      });
      if (result && typeof result === 'object' && typeof result.oxml === 'string') {
        xml = result.oxml;
      } else if (typeof result === 'string') {
        xml = result;
      }
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
