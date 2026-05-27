export type ExtractionMethod = 'regex' | 'llm' | 'hybrid';

export type ExtractedField<T> = {
  value: T | null;
  confidence: number | null;
  evidence: string | null;
  extractionMethod: ExtractionMethod | null;
};

export type ExtractedContractValues = {
  acv: ExtractedField<number>;
  termMonths: ExtractedField<number>;
  insuranceCover: ExtractedField<number>;
  dataType: ExtractedField<'standard' | 'personal' | 'sensitive'>;
};

function extractedField<T>(
  value: T | null,
  evidence: string | null,
  confidence: number | null = value === null ? null : 0.82,
): ExtractedField<T> {
  return {
    value,
    confidence: value === null ? null : confidence,
    evidence,
    extractionMethod: value === null ? null : 'regex',
  };
}

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
  // Explicit ACV / ARR labels
  'acv',
  'annual contract value',
  'annual recurring revenue',
  'arr',
  // Annual fee variants (most specific first)
  'annual subscription fee',
  'annual subscription price',
  'annual subscription',
  'annual licence fee',
  'annual license fee',
  'annual service fee',
  'annual services fee',
  'annual platform fee',
  'annual software fee',
  'annual saas fee',
  'annual fee',
  'annual fees',
  'annual charge',
  'annual charges',
  'annual price',
  'annual payment',
  'annual payments',
  // Generic subscription / licence terms (will be checked with nearby amounts)
  'subscription fee',
  'subscription fees',
  'subscription price',
  'subscription cost',
  'licence fee',
  'licence fees',
  'license fee',
  'license fees',
  'platform fee',
  'platform fees',
  'platform licence',
  'platform license',
  'saas fee',
  'saas subscription',
  'software subscription',
  'software fee',
  'service fee',
  'service fees',
  'services fee',
  'services fees',
  'recurring fee',
  'recurring fees',
  // Order / contract value labels
  'contract value',
  'total contract value',
  'order value',
  'total order value',
  'total annual value',
  'total value',
  'total annual fee',
  'total annual fees',
  'total fees',
];

const INSURANCE_KEYWORDS = ['insurance', 'insurance coverage', 'insurance cover', 'coverage'];

// Monthly labels — matched amounts will be multiplied by 12 to get ACV
const MONTHLY_FEE_KEYWORDS = [
  'monthly subscription fee',
  'monthly subscription',
  'monthly licence fee',
  'monthly license fee',
  'monthly service fee',
  'monthly platform fee',
  'monthly saas fee',
  'monthly fee',
  'monthly fees',
  'monthly charge',
  'monthly charges',
  'monthly payment',
  'monthly amount',
];

// Matches: £75,000  $90,000  €50,000  GBP 75,000  USD 90k  £50K etc.
const MONEY_REGEX = /(?:[£$€]|(?:GBP|USD|EUR)\s?)[\s]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?(?:\s*[kK]\b)?/g;
const MONTH_TERM_REGEX = /(\d{1,3})\s*(months?|mos?)/i;
const YEAR_TERM_REGEX = /(\d{1,3})\s*(years?|yrs?)/i;
// Detects "per month / /month / pm / p.m." after an amount on the same line
const PER_MONTH_SUFFIX = /per[\s-]?month|\/\s*month|\bpm\b|p\.m\.|per\s+mo\b/i;

function parseMoney(value: string): number {
  const hasK = /[kK]\s*$/.test(value.trim());
  const n = Number(value.replace(/[^\d.]/g, ''));
  return hasK ? n * 1000 : n;
}

function detectAmountByKeywords(lines: string[], keywords: string[]): ExtractedField<number> {
  for (const line of lines) {
    const normalizedLine = line.toLowerCase();
    const keyword = keywords.find((candidate) => normalizedLine.includes(candidate));
    if (!keyword) continue;

    const keywordIndex = normalizedLine.indexOf(keyword);
    const amountAfterKeyword = line.slice(keywordIndex).match(MONEY_REGEX)?.[0];
    if (amountAfterKeyword) {
      return extractedField(parseMoney(amountAfterKeyword), line);
    }

    const amountOnLine = line.match(MONEY_REGEX)?.[0];
    if (amountOnLine) {
      return extractedField(parseMoney(amountOnLine), line, 0.72);
    }
  }

  return extractedField<number>(null, null);
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
    const loadingTask = pdfjs.getDocument({ data: uint8 });
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

async function getMammoth(): Promise<Mammoth> {
  // Standard dynamic import — lets Next.js/Turbopack bundle mammoth and all
  // its transitive deps automatically, avoiding manual dep tracking in next.config.ts.
  // Node.js ESM can import CJS modules via import(), so no createRequire needed.
  const loaded = await import('mammoth') as Mammoth | { default: Mammoth };
  return 'extractRawText' in loaded ? loaded : loaded.default;
}

export function detectContractValues(text: string): ExtractedContractValues {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const acvResult = detectAmountByKeywords(lines, ACV_KEYWORDS);
  let detectedAcv: ExtractedField<number>;
  if (acvResult.value !== null) {
    detectedAcv = acvResult;
  } else {
    const monthlyResult = detectAmountByKeywords(lines, MONTHLY_FEE_KEYWORDS);
    detectedAcv =
      monthlyResult.value !== null
        ? { ...monthlyResult, value: monthlyResult.value * 12 }
        : monthlyResult;
  }
  const detectedInsurance = detectAmountByKeywords(lines, INSURANCE_KEYWORDS);

  let termMonths: number | null = null;
  let termEvidence: string | null = null;
  const monthMatch = text.match(MONTH_TERM_REGEX);
  if (monthMatch) {
    termMonths = Number(monthMatch[1]);
    termEvidence = monthMatch[0];
  } else {
    const yearMatch = text.match(YEAR_TERM_REGEX);
    if (yearMatch) {
      termMonths = Number(yearMatch[1]) * 12;
      termEvidence = yearMatch[0];
    }
  }

  const normalizedText = text.toLowerCase();
  let dataType: 'standard' | 'personal' | 'sensitive' | null = null;
  let dataEvidence: string | null = null;

  if (
    normalizedText.includes('special category data') ||
    normalizedText.includes('sensitive personal data')
  ) {
    dataType = 'sensitive';
    dataEvidence = 'special category data / sensitive personal data';
  } else if (normalizedText.includes('personal data')) {
    dataType = 'personal';
    dataEvidence = 'personal data';
  } else if (normalizedText.includes('standard data')) {
    dataType = 'standard';
    dataEvidence = 'standard data';
  }

  return {
    acv: detectedAcv,
    termMonths: extractedField(termMonths, termEvidence),
    insuranceCover: detectedInsurance,
    dataType: extractedField(dataType, dataEvidence),
  };
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const LEGACY_DOC_MIME = 'application/msword';
const PDF_MIME = 'application/pdf';
const MIN_CONTENT_LENGTH = 20;

const MAX_DOC_BYTES = 2 * 1024 * 1024; // 2 MB — legacy .doc binary scan limit
const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50 MB — zip bomb guard
const PARSER_TIMEOUT_MS = 15_000; // 15 s

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${PARSER_TIMEOUT_MS / 1000}s`)),
        PARSER_TIMEOUT_MS,
      ),
    ),
  ]);
}

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
    if (buffer.length < 5 || buffer.slice(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('Invalid file: not a valid PDF. Please re-upload the original contract.');
    }
    const pdfParse = await getPdfParser();
    const parsed = await withTimeout(pdfParse(buffer), 'PDF parser');
    text = parsed.text ?? '';
  } else if (fileKind === 'docx') {
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw new Error('Invalid file: not a valid DOCX. Please re-upload the original contract.');
    }
    // Zip bomb guard: read uncompressed sizes from the ZIP central directory
    // metadata without decompressing any entries, then reject if the total
    // exceeds the limit before mammoth processes the buffer.
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(buffer);
    let totalUncompressed = 0;
    zip.forEach((_, entry) => {
      totalUncompressed +=
        (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    });
    if (totalUncompressed > MAX_DOCX_UNCOMPRESSED_BYTES) {
      throw new Error('DOCX file exceeds the 50 MB decompressed size limit. Please upload a smaller document.');
    }
    if (!zip.file('word/document.xml')) {
      throw new Error('Invalid DOCX: missing required document structure. Please re-upload the original contract.');
    }
    const mammoth = await getMammoth();
    const parsed = await withTimeout(mammoth.extractRawText({ buffer }), 'DOCX parser');
    text = parsed.value ?? '';
  } else if (fileKind === 'doc') {
    if (buffer.length > MAX_DOC_BYTES) {
      throw new Error('Legacy .doc files must be under 2 MB. Please convert to PDF or DOCX and re-upload.');
    }
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
