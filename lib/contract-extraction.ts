export type ExtractedContractValues = {
  acv: number | null;
  termMonths: number | null;
  insuranceCover: number | null;
  dataType: 'standard' | 'personal' | 'sensitive';
};

type PdfParseResult = { text?: string };
type MammothResult = { value?: string };

type PdfJsDocument = {
  numPages: number;
  getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string; transform: number[] }> }> }>;
  destroy: () => void;
};
type PdfJsModule = {
  disableWorker: boolean;
  getDocument: (data: Uint8Array) => Promise<PdfJsDocument>;
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
    if (!keywords.some((keyword) => normalizedLine.includes(keyword))) {
      continue;
    }

    const moneyMatch = line.match(MONEY_REGEX)?.[0];
    if (moneyMatch) {
      return parseMoney(moneyMatch);
    }
  }

  return null;
}

async function getPdfParser(): Promise<PdfParse> {
  // Dynamic import is used to defer the load to runtime and prevent the
  // Next.js bundler from including these Node-only modules in the client build.
  // We use createRequire because the Next.js 16 / Turbopack server runtime uses
  // ESM, where the CJS 'require' global is not available.
  // pdf-parse v1.1.4 bundles pdf.js v1.10.100 which fails to initialize in
  // Node.js 22+. We load the v2.0.550 build directly via its subpath and pass
  // data as Uint8Array because pdf.js doesn't handle Node.js Buffers correctly.
  const { createRequire } = await import('module');
  const runtimeRequire = createRequire(process.cwd() + '/');
  const pdfjs = runtimeRequire('pdf-parse/lib/pdf.js/v2.0.550/build/pdf.js') as PdfJsModule;
  pdfjs.disableWorker = true;

  const parse: PdfParse = async (buffer: Buffer): Promise<PdfParseResult> => {
    const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const doc = await pdfjs.getDocument(uint8);
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let lastY: number | undefined;
      for (const item of content.items) {
        const y = item.transform[5];
        text += lastY !== undefined && y !== lastY ? '\n' : '';
        text += item.str;
        lastY = y;
      }
      text += '\n';
    }
    doc.destroy();
    return { text };
  };
  return parse;
}

async function getMammoth(): Promise<Mammoth> {
  // Same rationale as getPdfParser: use createRequire for ESM-safe dynamic loading.
  const { createRequire } = await import('module');
  const runtimeRequire = createRequire(process.cwd() + '/');
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
const PDF_MIME = 'application/pdf';
const MIN_CONTENT_LENGTH = 200;

export async function extractContractText(
  fileName: string,
  buffer: Buffer,
  mimeType?: string,
): Promise<string> {
  console.log('[contract-extraction] fileName:', fileName);
  console.log('[contract-extraction] mimeType:', mimeType ?? '(none)');
  console.log('[contract-extraction] bufferSize:', buffer.length, 'bytes');

  let isPdf = mimeType === PDF_MIME;
  let isDocx = mimeType === DOCX_MIME;

  if (!isPdf && !isDocx) {
    const extension = fileName.toLowerCase().split('.').pop();
    isPdf = extension === 'pdf';
    isDocx = extension === 'docx';
  }

  let text = '';

  if (isPdf) {
    const pdfParse = await getPdfParser();
    const parsed = await pdfParse(buffer);
    text = parsed.text ?? '';
  } else if (isDocx) {
    const mammoth = await getMammoth();
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value ?? '';
  } else {
    throw new Error('Unsupported file type. Please upload a PDF or DOCX contract.');
  }

  console.log('[contract-extraction] extractedText.length:', text.length);

  if (text.length < MIN_CONTENT_LENGTH) {
    throw new Error('Failed to extract meaningful content from document');
  }

  return text;
}
