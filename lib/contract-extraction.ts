export type ExtractedContractValues = {
  acv: number | null;
  termMonths: number | null;
  insuranceCover: number | null;
  dataType: 'standard' | 'personal' | 'sensitive';
};

type PdfParseResult = { text?: string };
type MammothResult = { value?: string };

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
  // (0, eval)('require') is used intentionally to defer the require call to
  // runtime, preventing Next.js/webpack from bundling these Node-only modules
  // into the client bundle or triggering static analysis warnings.
  const runtimeRequire = (0, eval)('require') as (name: string) => unknown;
  const loaded = runtimeRequire('pdf-parse') as PdfParse | { default: PdfParse };

  return typeof loaded === 'function' ? loaded : loaded.default;
}

async function getMammoth(): Promise<Mammoth> {
  // Same rationale as getPdfParser: deferred require to keep these out of
  // the client bundle.
  const runtimeRequire = (0, eval)('require') as (name: string) => unknown;
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

export async function extractContractText(fileName: string, buffer: Buffer): Promise<string> {
  const extension = fileName.toLowerCase().split('.').pop();

  if (extension === 'pdf') {
    const pdfParse = await getPdfParser();
    const parsed = await pdfParse(buffer);
    return parsed.text ?? '';
  }

  if (extension === 'docx') {
    const mammoth = await getMammoth();
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value ?? '';
  }

  throw new Error('Unsupported file type. Please upload a PDF or DOCX contract.');
}
