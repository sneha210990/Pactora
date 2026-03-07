'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NegotiationLadder } from '../components/negotiation-ladder';

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

const CLAUSE_STORAGE_KEY = 'pactora.terminationClause';

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

function parseNoticePeriod(text: string): string {
  const noticeRegex = /(notice|written notice|terminate on)[^\d]{0,25}(\d{1,3})\s+(day|days|month|months)/g;
  const directRegex = /(\d{1,3})\s+(day|days|month|months)/g;

  const noticeMatch = noticeRegex.exec(text);
  if (noticeMatch) {
    return `${noticeMatch[2]} ${noticeMatch[3]}`;
  }

  const directMatch = directRegex.exec(text);
  if (directMatch) {
    return `${directMatch[1]} ${directMatch[2]}`;
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
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function TerminationReviewContent() {
  const searchParams = useSearchParams();

  const acv = searchParams.get('acv');
  const termMonths = searchParams.get('termMonths');
  const insuranceCover = searchParams.get('insuranceCover');
  const dataType = searchParams.get('dataType');
  const lolCapParam = searchParams.get('lolCap');

  const acvAmount = num(acv);
  const insuranceAmount = num(insuranceCover);
  const lolCap = num(lolCapParam);

  const [clause, setClause] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(CLAUSE_STORAGE_KEY) ?? '';
  });
  const [result, setResult] = useState<ReviewResult | null>(null);

  useEffect(() => {
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
  }, [clause]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (acv) params.set('acv', acv);
    if (termMonths) params.set('termMonths', termMonths);
    if (insuranceCover) params.set('insuranceCover', insuranceCover);
    if (dataType) params.set('dataType', dataType);
    if (lolCapParam) params.set('lolCap', lolCapParam);
    return params.toString();
  }, [acv, termMonths, insuranceCover, dataType, lolCapParam]);

  function runReview() {
    setResult(parseClause(clause));
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
  }

  function reset() {
    window.localStorage.removeItem(CLAUSE_STORAGE_KEY);
    setClause('');
    setResult(null);
  }

  const showWarning = result && result.redFlags.length > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <Link href="/deals/new" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
            New Deal
          </Link>
        </div>

        <section className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Termination Review</h1>
          <p className="mt-2 text-zinc-400">
            Assess whether termination rights, notice periods, and post-termination obligations create commercial risk.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {acvAmount !== null && acvAmount > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">ACV: {money(acvAmount)}</span>
            )}
            {termMonths && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Term: {termMonths} months</span>
            )}
            {insuranceAmount !== null && insuranceAmount > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Insurance: {money(insuranceAmount)}</span>
            )}
            {dataType && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Data: {dataType}</span>
            )}
            {lolCap !== null && lolCap > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">LoL cap: {money(lolCap)}</span>
            )}
          </div>
        </section>

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
          <section className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ReviewCard label="Termination right" value={result.terminationRight} />
              <ReviewCard label="Notice period" value={result.noticePeriod} />
              <ReviewCard label="Cure rights" value={result.cureRights} />
              <div className={`rounded-xl border p-4 ${riskClass(result.riskRating)}`}>
                <div className="text-xs uppercase tracking-wide">Risk rating</div>
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
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/review/data${queryString ? `?${queryString}` : ''}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
            Back
          </Link>
          <Link href={`/review/summary${queryString ? `?${queryString}` : ''}`} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
            Continue
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
