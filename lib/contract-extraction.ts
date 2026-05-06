export type ExtractedContractValues = {
  acv: number | null;
  termMonths: number | null;
  insuranceCover: number | null;
  dataType: 'standard' | 'personal' | 'sensitive';
};

type PdfParseResult = { text?: string };
type MammothResult = { value?: string };

type PdfJsTextItem = { str?: string; transform?: number[] };

type PdfJsDocument = {
  numPages: number;
  getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: PdfJsTextItem[] }> }>;
  destroy: () => void;
};
type PdfJsLoadingTask = Promise<PdfJsDocument> & { promise?: Promise<PdfJsDocument> };
type PdfJsModule = {
  disableWorker: boolean;
  getDocument: (options: { data: Uint8Array } | Uint8Array) => PdfJsLoadingTask;
};

type PdfParse = (buffer: Buffer) => Promise<PdfParseResult>;

type Mammoth = {
  extractRawText: (input: { buffer: Buffer }) => Promise<MammothResult>;
};

const ACV_KEYWORDS = [
  'acv',
  'annual fee',
  'annual fees',
  'annual subscription fee',
  'contract value',
  'annual contract value',
];

const INSURANCE_KEYWORDS = ['insurance', 'insurance coverage', 'insurance cover', 'coverage'];

const MONEY_REGEX = /(?:£|\$)\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
const MONTH_TERM_REGEX = /(\d{1,3})\s*(months?|mos?)/i;
const YEAR_TERM_REGEX = /(\d{1,3})\s*(years?|yrs?)/i;

function parseMoney(value: string): number {
  return Number(value.replace(/[^\d.]/g, ''));
}

function detectAmountByKeywords(lines: string[], keywords: string[]): number | null {
  for (const line of lines) {
    const normalizedLine = line.toLowerCase();
    const keyword = keywords.find((candidate) => normalizedLine.includes(candidate));
    if (!keyword) continue;

    const keywordIndex = normalizedLine.indexOf(keyword);
    const amountAfterKeyword = line.slice(keywordIndex).match(MONEY_REGEX)?.[0];
    if (amountAfterKeyword) {
      return parseMoney(amountAfterKeyword);
    }

    const amountOnLine = line.match(MONEY_REGEX)?.[0];
    if (amountOnLine) {
      return parseMoney(amountOnLine);
    }
  }

  return null;
}

async function getPdfParser(): Promise<PdfParse> {
  // Use createRequire anchored to this file's URL so module resolution works
  // consistently regardless of process.cwd() (which differs on Vercel).
  const { createRequire } = await import('module');
  const runtimeRequire = createRequire(import.meta.url);

  // Prefer the pdf.js v2.0.550 subpath: the main pdf-parse entry bundles
  // v1.10.100 which fails to initialise on Node 22+. On Vercel (Node ≤ 20)
  // this internal path may not survive file-tracing, so we fall back to the
  // main pdf-parse API which works fine there.
  let pdfjs: PdfJsModule | null = null;
  try {
    pdfjs = runtimeRequire('pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js') as PdfJsModule;
    pdfjs.disableWorker = true;
  } catch {
    // internal subpath not available – fall back to pdf-parse main entry below
  }

  if (pdfjs) {
    const resolvedPdfjs = pdfjs;
    const parse: PdfParse = async (buffer: Buffer): Promise<PdfParseResult> => {
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const loadingTask = resolvedPdfjs.getDocument({ data: uint8 });
      const doc = await (loadingTask.promise ?? loadingTask);
      let text = '';

      try {
        for (let i = 1; i <= doc.numPages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          let lastY: number | undefined;

          for (const item of content.items) {
            const fragment = item.str?.trim();
            if (!fragment) continue;

            const y = item.transform?.[5];
            if (lastY !== undefined && y !== undefined && Math.abs(y - lastY) > 1) {
              text = text.trimEnd() + '\n';
            } else if (text && !/[\s\n]$/.test(text)) {
              text += ' ';
            }

            text += fragment;
            lastY = y;
          }

          text = text.trimEnd() + '\n';
        }
      } finally {
        doc.destroy();
      }

      return { text };
    };
    return parse;
  }

  // Fallback: pdf-parse main entry (bundles pdf.js v1.10.100, safe on Node ≤ 20)
  const pdfParse = runtimeRequire('pdf-parse') as PdfParse;
  return pdfParse;
}

async function getMammoth(): Promise<Mammoth> {
  const { createRequire } = await import('module');
  const runtimeRequire = createRequire(import.meta.url);
  const loaded = runtimeRequire('mammoth') as Mammoth | { default: Mammoth };
  return 'extractRawText' in loaded ? loaded : loaded.default;
}

export function detectContractValues(text: string): ExtractedContractValues {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const detectedAcv = detectAmountByKeywords(lines, ACV_KEYWORDS);
  const detectedInsurance = detectAmountByKeywords(lines, INSURANCE_KEYWORDS);

  let termMonths: number | null = null;
  const monthMatch = text.match(MONTH_TERM_REGEX);
  if (monthMatch) {
    termMonths = Number(monthMatch[1]);
  } else {
    const yearMatch = text.match(YEAR_TERM_REGEX);
    if (yearMatch) {
      termMonths = Number(yearMatch[1]) * 12;
    }
  }

  const normalizedText = text.toLowerCase();
  let dataType: ExtractedContractValues['dataType'] = 'standard';

  if (
    normalizedText.includes('special category data') ||
    normalizedText.includes('sensitive personal data')
  ) {
    dataType = 'sensitive';
  } else if (normalizedText.includes('personal data')) {
    dataType = 'personal';
  }

  return {
    acv: detectedAcv,
    termMonths,
    insuranceCover: detectedInsurance,
    dataType,
  };
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const LEGACY_DOC_MIME = 'application/msword';
const PDF_MIME = 'application/pdf';
const MIN_CONTENT_LENGTH = 20;

type ContractFileKind = 'pdf' | 'docx' | 'doc' | 'unsupported';

function detectFileKind(fileName: string, mimeType?: string): ContractFileKind {
  const normalizedMime = mimeType?.toLowerCase() ?? '';
  const extension = fileName.toLowerCase().split('.').pop();

  if (normalizedMime === PDF_MIME || extension === 'pdf') return 'pdf';
  if (normalizedMime === DOCX_MIME || extension === 'docx') return 'docx';
  if (normalizedMime === LEGACY_DOC_MIME || extension === 'doc') return 'doc';

  return 'unsupported';
}

function extractLegacyDocText(buffer: Buffer): string {
  // Legacy .doc files are binary OLE documents. Without a platform binary such as
  // antiword available in production, this best-effort fallback pulls readable
  // text runs out of the binary so common contract fields can still be detected.
  return buffer
    .toString('latin1')
    .replace(/\0/g, ' ')
    .match(/[ -~£]{4,}/g)
    ?.join('\n')
    .replace(/\s{2,}/g, ' ')
    .trim() ?? '';
}

export async function extractContractText(
  fileName: string,
  buffer: Buffer,
  mimeType?: string,
): Promise<string> {
  console.log('[contract-extraction] fileName:', fileName);
  console.log('[contract-extraction] mimeType:', mimeType ?? '(none)');
  console.log('[contract-extraction] bufferSize:', buffer.length, 'bytes');

  const fileKind = detectFileKind(fileName, mimeType);
  let text = '';

  if (fileKind === 'pdf') {
    const pdfParse = await getPdfParser();
    const parsed = await pdfParse(buffer);
    text = parsed.text ?? '';
  } else if (fileKind === 'docx') {
    const mammoth = await getMammoth();
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value ?? '';
  } else if (fileKind === 'doc') {
    text = extractLegacyDocText(buffer);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF, DOCX, or DOC contract.');
  }

  text = text.replace(/\r\n?/g, '\n').trim();
  console.log('[contract-extraction] extractedText.length:', text.length);

  if (text.length < MIN_CONTENT_LENGTH) {
    throw new Error(
      'No readable text was found in this document. If it is scanned or image-only, please upload a text-based PDF or DOCX.',
    );
  }

  return text;
}
