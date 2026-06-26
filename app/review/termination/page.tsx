'use client';

import Link from 'next/link';
import { Suspense, useRef, useState } from 'react';
import { NegotiationLadder } from '../components/negotiation-ladder';
import { RedlineSuggestion } from '../components/redline-suggestion';
import { ActiveDocumentBanner, formatOptionalMoneyField, formatOptionalMonthsField, formatOptionalTextField } from '../components/active-document-banner';
import { NewReviewButton } from '../components/new-review-button';
import { ReviewProgress } from '../components/review-progress';
import type { ClauseFlag } from '@/lib/document-analysis-store';
import { useClauseByType, useDocumentAnalysis, useDocumentAnalysisActions, useDocumentCommercialContext } from '@/lib/document-analysis-store';
import { LEGAL_DISCLAIMER } from '@/lib/constants';
import { Tooltip } from '@/components/tooltip';

type TerminationRight = 'Mutual' | 'One-sided' | 'Unknown';
type CureRights = 'Present' | 'Absent' | 'Unknown';
type RiskRating = 'Low' | 'Medium' | 'High';

type ReviewResult = {
  terminationRight: TerminationRight;
  noticePeriod: string;
  cureRights: CureRights;
  convenienceTermination: boolean;
  postTerminationObligations: 'Flagged' | 'Not detected';
  riskRating: RiskRating;
  redFlags: string[];
};


function normalize(input: string) {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

function money(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}

function num(value: string | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseTerminationRight(text: string): TerminationRight {
  if (text.includes('either party may terminate')) {
    return 'Mutual';
  }

  const customerRight = text.includes('customer may terminate') || text.includes('client may terminate');
  const providerRight =
    text.includes('provider may terminate') ||
    text.includes('supplier may terminate') ||
    text.includes('vendor may terminate');

  if (customerRight !== providerRight) {
    return 'One-sided';
  }

  return 'Unknown';
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fortyfive: 45,
  sixty: 60,
  ninety: 90,
};

const NUMBER_WORD_PATTERN = [
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'fifteen',
  'twenty',
  'thirty',
  'forty',
  String.raw`forty[-\s]?five`,
  'sixty',
  'ninety',
].join('|');
const WRITTEN_AMOUNT_WITH_NUMERAL_PATTERN = String.raw`(?:${NUMBER_WORD_PATTERN})\s*\(\s*\d{1,3}\s*\)`;
const NUMERAL_AMOUNT_PATTERN = String.raw`(?:\d{1,3})(?:\s*\(\s*\d{1,3}\s*\))?`;
const NOTICE_AMOUNT_PATTERN = String.raw`(${WRITTEN_AMOUNT_WITH_NUMERAL_PATTERN}|${NUMERAL_AMOUNT_PATTERN}|${NUMBER_WORD_PATTERN})`;
const NOTICE_UNIT_PATTERN = String.raw`(days|day|months|month)`;

function normalizeNoticeAmount(value: string): string {
  const numericMatch = value.match(/\d{1,3}/);
  if (numericMatch) return numericMatch[0];

  const wordKey = value.replace(/[\s-]+/g, '');
  return String(NUMBER_WORDS[wordKey] ?? value);
}

function formatNoticePeriod(match: RegExpMatchArray, amountIndex: number, unitIndex: number): string {
  return `${normalizeNoticeAmount(match[amountIndex])} ${match[unitIndex]}`;
}

function parseNoticePeriod(text: string): string {
  const noticeTermsPattern = [
    String.raw`notice(?:\s+of\s+termination)?(?:\s+period)?`,
    String.raw`written\s+notice`,
    String.raw`prior\s+(?:written\s+)?notice`,
    String.raw`terminate\s+on`,
    String.raw`giving(?:\s+not\s+less\s+than)?`,
  ].join('|');
  const noticeBeforeAmountPattern = String.raw`(?:${noticeTermsPattern})\D{0,80}${NOTICE_AMOUNT_PATTERN}\s+${NOTICE_UNIT_PATTERN}`;

  const noticePatterns = [
    new RegExp(noticeBeforeAmountPattern),
    new RegExp(
      String.raw`${NOTICE_AMOUNT_PATTERN}\s+${NOTICE_UNIT_PATTERN}(?:'|’)?s?\s+(?:prior\s+)?(?:written\s+)?notice`,
    ),
    new RegExp(
      String.raw`${NOTICE_AMOUNT_PATTERN}\s+${NOTICE_UNIT_PATTERN}(?:'|’)?s?\s+notice\s+of\s+termination`,
    ),
    new RegExp(
      String.raw`termination\s+notice\s+(?:period\s+)?(?:is|of|shall\s+be|must\s+be)?\D{0,40}${NOTICE_AMOUNT_PATTERN}\s+${NOTICE_UNIT_PATTERN}`,
    ),
  ];

  for (const pattern of noticePatterns) {
    const noticeMatch = text.match(pattern);
    if (noticeMatch) {
      return formatNoticePeriod(noticeMatch, 1, 2);
    }
  }

  const directMatch = text.match(new RegExp(String.raw`${NOTICE_AMOUNT_PATTERN}\s+${NOTICE_UNIT_PATTERN}`));
  if (directMatch) {
    return formatNoticePeriod(directMatch, 1, 2);
  }

  return 'Unknown';
}

function parseCureRights(text: string): CureRights {
  if (
    text.includes('cure period') ||
    text.includes('opportunity to remedy') ||
    text.includes('may remedy within') ||
    /within\s+\d{1,3}\s+days\s+after\s+notice/.test(text)
  ) {
    return 'Present';
  }

  if (
    text.includes('immediate termination') ||
    text.includes('terminate immediately') ||
    text.includes('with immediate effect')
  ) {
    return 'Absent';
  }

  return 'Unknown';
}

function parsePostTermination(text: string) {
  const obligationsDetected =
    text.includes('return or destroy data') ||
    text.includes('delete personal data') ||
    text.includes('transition assistance') ||
    text.includes('exit assistance') ||
    text.includes('cooperate on transition');

  const broadAssistance =
    text.includes('all assistance as required') ||
    text.includes('indefinite assistance') ||
    text.includes('any assistance requested');

  return {
    obligationsDetected,
    broadAssistance,
  };
}

function isVeryShortNotice(noticePeriod: string): boolean {
  const match = noticePeriod.match(/(\d{1,3})\s+(day|days|month|months)/);
  if (!match) return false;

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith('day')) {
    return amount <= 30;
  }

  return false;
}

function deriveRiskRating(result: Omit<ReviewResult, 'riskRating'>): RiskRating {
  const shortNotice = isVeryShortNotice(result.noticePeriod);
  const hasImmediateTermination = result.cureRights === 'Absent';

  if (
    (result.terminationRight === 'One-sided' && result.convenienceTermination) ||
    shortNotice ||
    hasImmediateTermination
  ) {
    return 'High';
  }

  if (result.terminationRight === 'One-sided' || result.postTerminationObligations === 'Flagged' || result.cureRights === 'Unknown') {
    return 'Medium';
  }

  if (result.terminationRight === 'Mutual' && !shortNotice && result.cureRights === 'Present') {
    return 'Low';
  }

  return 'Medium';
}

function parseClause(clause: string): ReviewResult {
  const text = normalize(clause);
  const terminationRight = parseTerminationRight(text);
  const noticePeriod = parseNoticePeriod(text);
  const cureRights = parseCureRights(text);
  const convenienceTermination = text.includes('terminate for convenience');
  const { obligationsDetected, broadAssistance } = parsePostTermination(text);

  const redFlags: string[] = [];

  if (terminationRight === 'One-sided' && convenienceTermination) {
    redFlags.push('One-sided convenience termination right detected.');
  }

  if (isVeryShortNotice(noticePeriod)) {
    redFlags.push('Very short notice period may create operational risk.');
  }

  if (cureRights === 'Absent') {
    redFlags.push('Immediate termination appears possible without cure rights.');
  }

  if (obligationsDetected) {
    redFlags.push('Post-termination data return/deletion or transition obligations detected.');
  }

  if (broadAssistance) {
    redFlags.push('Broad or potentially indefinite transition assistance language detected.');
  }

  const baseResult = {
    terminationRight,
    noticePeriod,
    cureRights,
    convenienceTermination,
    postTerminationObligations: obligationsDetected ? ('Flagged' as const) : ('Not detected' as const),
    redFlags,
  };

  return {
    ...baseResult,
    riskRating: deriveRiskRating(baseResult),
  };
}

function riskClass(risk: RiskRating) {
  if (risk === 'High') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (risk === 'Low') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function ReviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function synthesizeTerminationFlag(clauseText: string, result: ReviewResult): ClauseFlag {
  const summary = `Termination right: ${result.terminationRight}. Notice period: ${result.noticePeriod}. Cure rights: ${result.cureRights}. Convenience termination: ${result.convenienceTermination ? 'Yes' : 'No'}. Post-termination obligations: ${result.postTerminationObligations}.`;
  const negotiation =
    result.terminationRight === 'One-sided' && result.convenienceTermination
      ? 'Remove unilateral convenience termination or make it mutual with adequate notice. Convenience termination for one party only creates significant revenue risk.'
      : result.cureRights === 'Absent'
        ? 'Add a cure period (minimum 30 days) for remediable breaches before termination rights can be exercised.'
        : result.noticePeriod !== 'Unknown' && isVeryShortNotice(result.noticePeriod)
          ? 'Extend the notice period to at least 60–90 days to allow for customer transition and operational planning.'
          : 'Narrow post-termination obligations to defined, time-limited data return and deletion duties. Avoid open-ended transition assistance.';
  return {
    clauseType: 'Termination',
    riskLevel: result.riskRating,
    clauseText,
    problematicLanguage: result.redFlags.join(' ') || clauseText.slice(0, 200),
    plainEnglish: summary,
    negotiationPoint: negotiation,
  };
}

function TerminationReviewContent() {
  const commercialContext = useDocumentCommercialContext();
  const analysis = useDocumentAnalysis();
  const acceptedRedlines = analysis.acceptedRedlines ?? {};
  const canonicalClause = useClauseByType('Termination');

  const dataType = commercialContext.dataType;
  const lolCapParam = commercialContext.liabilityCap ? String(commercialContext.liabilityCap) : null;

  const lolCap = num(lolCapParam);

  const actions = useDocumentAnalysisActions();
  const [clause, setClause] = useState(canonicalClause?.text ?? '');
  const [result, setResult] = useState<ReviewResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const queryString = '';

  function runReview() {
    const parsed = parseClause(clause);
    setResult(parsed);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    if (clause.trim()) {
      actions.setManualReviewFlag(synthesizeTerminationFlag(clause, parsed));
    }
  }

  function reset() {
    setClause('');
    setResult(null);
  }

  const showWarning = result && result.redFlags.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/review/summary" className="text-sm text-zinc-300 hover:text-white">
            ← Summary
          </Link>
          <NewReviewButton className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900" />
        </div>

        <ReviewProgress current="termination" />
        <ActiveDocumentBanner />

        <section className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Termination Review</h1>
          <p className="mt-2 text-zinc-400">
            Assess whether termination rights, notice periods, and post-termination obligations create commercial risk.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Tooltip content="Annual Contract Value — the total revenue from this contract in one year.">
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">ACV: {formatOptionalMoneyField(commercialContext.acv)}</span>
            </Tooltip>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Term: {formatOptionalMonthsField(commercialContext.termMonths)}</span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Insurance: {formatOptionalMoneyField(commercialContext.insuranceCover)}</span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Data: {formatOptionalTextField(dataType)}</span>
            {lolCap !== null && lolCap > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Liability cap: {money(lolCap)}</span>
            )}
          </div>
        </section>

        {!canonicalClause?.text && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <div className="font-semibold">Termination clause not detected</div>
            <p className="mt-1 text-amber-300/80">
              Pactora did not find a termination clause in your uploaded contract. Without explicit termination provisions, the other party may rely on common law rights to terminate with little or no notice. Paste the relevant wording below if it exists, or use the negotiation guidance to request appropriate termination terms.
            </p>
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Clause input</h2>
            <p className="text-xs text-zinc-400">
              Paste the termination wording here to assess convenience termination, notice periods, cure rights, and data return obligations.
            </p>
          </div>
          <label htmlFor="terminationClause" className="text-base font-semibold">
            Paste the termination clause
          </label>
          <textarea
            id="terminationClause"
            rows={8}
            value={clause}
            onChange={(event) => setClause(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-black/40 p-4 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
            placeholder="Paste termination wording..."
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={runReview} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400">
              Run review
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
              Reset
            </button>
          </div>
        </section>

        {result && (
          <section ref={resultRef} className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ReviewCard label="Termination right" value={result.terminationRight} />
              <ReviewCard label="Notice period" value={result.noticePeriod} />
              <ReviewCard label="Cure rights" value={result.cureRights} />
              <div className={`rounded-xl border p-4 ${riskClass(result.riskRating)}`}>
                <div className="text-xs">Risk rating</div>
                <div className="mt-2 text-base font-semibold">{result.riskRating}</div>
              </div>
            </div>

            {showWarning && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                <div className="text-sm font-semibold">Termination warning</div>
                <p className="mt-1 text-sm">
                  This clause may allow the other party to terminate quickly or impose operational obligations that outlast the deal.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <h3 className="text-base font-semibold">Detected from your clause</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Termination right</span>
                  <span className="font-medium">{result.terminationRight}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Notice period</span>
                  <span className="font-medium">{result.noticePeriod}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Cure rights</span>
                  <span className="font-medium">{result.cureRights}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Convenience termination</span>
                  <span className="font-medium">{result.convenienceTermination ? 'Detected' : 'Not detected'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Post-termination obligations</span>
                  <span className="font-medium">{result.postTerminationObligations}</span>
                </div>
                <div>
                  <div className="mb-2 text-zinc-400">Extracted red flags</div>
                  {result.redFlags.length > 0 ? (
                    <ul className="space-y-2">
                      {result.redFlags.map((flag) => (
                        <li key={flag} className="rounded-lg border border-zinc-800 bg-black/30 p-3 text-zinc-200">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-lg border border-zinc-800 bg-black/30 p-3 text-zinc-300">No clear red flags detected.</div>
                  )}
                </div>
              </div>
            </div>

            <NegotiationLadder
              title="Negotiation ladder"
              items={[
                {
                  label: 'Position 1',
                  title: 'Avoid unilateral convenience termination unless truly required',
                  script:
                    '“We should avoid one-way convenience termination rights unless there is a clear commercial reason and corresponding protections.”',
                },
                {
                  label: 'Position 2',
                  title: 'Extend short notice periods to what operations can handle',
                  script:
                    '“Notice periods should be long enough for customer transition and service planning, rather than forcing abrupt termination.”',
                },
                {
                  label: 'Position 3',
                  title: 'Require cure rights for remediable breaches',
                  script:
                    '“Where a breach can be fixed, the contract should provide a clear cure period before termination rights are exercised.”',
                },
                {
                  label: 'Position 4',
                  title: 'Narrow post-termination obligations with reasonable timing',
                  script:
                    '“Post-termination duties should focus on data return/deletion with practical timelines, not open-ended transition commitments.”',
                },
              ]}
            />
            <RedlineSuggestion
              clauseText={clause}
              clauseType="Termination"
              acv={commercialContext.acv.value}
              liabilityCap={lolCap}
              isAccepted={!!acceptedRedlines['Termination']}
              onAccept={(clauseText, proposedText, explanation) =>
                actions.acceptRedline('Termination', clauseText, proposedText, explanation)
              }
              onDismiss={() => actions.dismissRedline('Termination')}
            />
            <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">{LEGAL_DISCLAIMER}</p>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/review/data${queryString ? `?${queryString}` : ''}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
            Back
          </Link>
          <Link href={`/review/summary${queryString ? `?${queryString}` : ''}`} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400">
            Continue to Summary
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function TerminationReviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-6 text-white">Loading review…</main>}>
      <TerminationReviewContent />
    </Suspense>
  );
}
