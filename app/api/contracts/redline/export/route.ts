import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { renderToBuffer } from '@react-pdf/renderer';
import { MarkupSchedulePdf } from '@/components/markup-schedule-pdf';
import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { applyRedlineToOxml, setDefaultAuthor } = require('@ansonlai/docx-redline-js') as {
  applyRedlineToOxml: (xml: string, original: string, proposed: string, options?: Record<string, unknown>) => Promise<{ oxml?: string; hasChanges?: boolean } | string>;
  setDefaultAuthor: (author: string) => void;
};

export const runtime = 'nodejs';
export const maxDuration = 30;

type AcceptedRedline = { clauseText: string; proposedText: string; explanation: string };

type RequestBody = {
  acceptedRedlines: Record<string, AcceptedRedline>;
  docxBuffer?: string;
  sourceFileType: 'docx' | 'pdf';
  fileName: string;
};

async function buildDocxRedline(
  acceptedRedlines: Record<string, AcceptedRedline>,
  docxBase64: string,
  fileName: string,
): Promise<NextResponse> {
  try {
    setDefaultAuthor('Pactora');
    const buffer = Buffer.from(docxBase64, 'base64');
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

    return new NextResponse(outputBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName.replace(/\.[^.]+$/, '')}-redlined.docx"`,
      },
    });
  } catch (err) {
    console.error('[redline/export] DOCX generation failed, falling back to markup schedule:', err);
    return buildMarkupSchedule(acceptedRedlines, fileName);
  }
}

async function buildMarkupSchedule(
  acceptedRedlines: Record<string, AcceptedRedline>,
  fileName: string,
): Promise<NextResponse> {
  const items = Object.entries(acceptedRedlines).map(([clauseType, r]) => ({
    clauseType,
    ...r,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(MarkupSchedulePdf, {
    items,
    fileName,
    generatedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  }) as React.ReactElement<any>;

  const pdfBuffer = await renderToBuffer(element);

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName.replace(/\.[^.]+$/, '')}-markup-schedule.pdf"`,
    },
  });
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { acceptedRedlines, docxBuffer, sourceFileType, fileName } = body;

  if (!acceptedRedlines || Object.keys(acceptedRedlines).length === 0) {
    return NextResponse.json({ error: 'No accepted redlines provided.' }, { status: 400 });
  }

  if (sourceFileType === 'docx' && docxBuffer) {
    return buildDocxRedline(acceptedRedlines, docxBuffer, fileName ?? 'contract');
  }

  return buildMarkupSchedule(acceptedRedlines, fileName ?? 'contract');
}
