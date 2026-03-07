'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NegotiationLadder } from '../components/negotiation-ladder';

type Directionality = 'Mutual' | 'One-sided' | 'Unknown';
type TriggerScope = 'IP' | 'Data' | 'Third-party claims' | 'Broad breach' | 'Unknown';
type CapInteraction = 'Inside cap' | 'Potentially outside cap' | 'Unknown';
type RiskRating = 'Low' | 'Medium' | 'High';

type ReviewResult = {
  directionality: Directionality;
  triggerScope: TriggerScope;
  capInteraction: CapInteraction;
  riskRating: RiskRating;
  redFlags: string[];
};

const CLAUSE_STORAGE_KEY = 'pactora.indemnityClause';

const DEFAULT_CLAUSE =
  'Supplier shall indemnify Customer against any third-party claim alleging intellectual property infringement, subject to the limitations of liability in this Agreement.';

function num(value: string | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

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

function includesAny(text: string, phrases: string[]) {
  return phrases.some((phrase) => text.includes(phrase));
}

function parseDirectionality(text: string): Directionality {
  if (includesAny(text, ['each party shall indemnify', 'mutual'])) {
    return 'Mutual';
  }

  const customerIndemnifies =
    /customer[^.]{0,120}indemnif/.test(text) && /(vendor|provider|supplier)/.test(text);
  const vendorIndemnifies =
    /(vendor|provider|supplier)[^.]{0,120}indemnif/.test(text) && /customer/.test(text);

  if ((customerIndemnifies && !vendorIndemnifies) || (!customerIndemnifies && vendorIndemnifies)) {
    return 'One-sided';
  }

  return 'Unknown';
}

function parseTriggerScope(text: string): TriggerScope {
  if (includesAny(text, ['intellectual property', 'ip infringement'])) {
    return 'IP';
  }
  if (includesAny(text, ['data protection', 'gdpr', 'personal data', 'data breach'])) {
    return 'Data';
  }
  if (includesAny(text, ['third party claim', 'third-party claim'])) {
    return 'Third-party claims';
  }
  if (includesAny(text, ['any breach', 'all claims', 'all losses', 'any loss'])) {
    return 'Broad breach';
  }
  return 'Unknown';
}

function parseCapInteraction(text: string): CapInteraction {
  if (
    includesAny(text, [
      'notwithstanding the liability cap',
      'cap shall not apply',
      'outside the limitation of liability',
      'unlimited indemnity',
      'this indemnity shall not be limited',
    ])
  ) {
    return 'Potentially outside cap';
  }

  if (
    includesAny(text, [
      'subject to the limitations of liability',
      'subject to clause [liability]',
      'within the liability cap',
    ])
  ) {
    return 'Inside cap';
  }

  return 'Unknown';
}

function deriveRedFlags(text: string, result: Omit<ReviewResult, 'riskRating' | 'redFlags'>): string[] {
  const flags: string[] = [];

  if (result.directionality === 'One-sided') {
    flags.push('One-sided indemnity obligation detected.');
  }
  if (result.triggerScope === 'Broad breach') {
    flags.push('Broad trigger language (e.g., any breach/all losses) detected.');
  }
  if (result.capInteraction === 'Potentially outside cap') {
    flags.push('Cap override language suggests uncapped or quasi-uncapped exposure.');
  }
  if (includesAny(text, ['notwithstanding', 'shall not apply'])) {
    flags.push('Override wording may displace standard liability protections.');
  }

  return flags;
}

function parseClause(clause: string): ReviewResult {
  const text = normalize(clause);
  const directionality = parseDirectionality(text);
  const triggerScope = parseTriggerScope(text);
  const capInteraction = parseCapInteraction(text);

  const isLimitedScope = triggerScope === 'IP' || triggerScope === 'Data' || triggerScope === 'Third-party claims';

  let riskRating: RiskRating = 'Medium';

  if (directionality === 'One-sided' && capInteraction === 'Potentially outside cap') {
    riskRating = 'High';
  } else if (directionality === 'Mutual' && capInteraction === 'Inside cap' && isLimitedScope) {
    riskRating = 'Low';
  } else if (
    directionality === 'One-sided' ||
    triggerScope === 'Broad breach' ||
    capInteraction === 'Unknown'
  ) {
    riskRating = 'Medium';
  }

  const redFlags = deriveRedFlags(text, { directionality, triggerScope, capInteraction });

  return {
    directionality,
    triggerScope,
    capInteraction,
    riskRating,
    redFlags,
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

function IndemnitiesReviewContent() {
  const searchParams = useSearchParams();

  const acv = searchParams.get('acv');
  const termMonths = searchParams.get('termMonths');
  const insuranceCover = searchParams.get('insuranceCover');
  const dataType = searchParams.get('dataType');
  const lolCap = num(searchParams.get('lolCap'));
  const acvAmount = num(acv);

  const ladderBaseCap = lolCap !== null && lolCap > 0 ? lolCap : acvAmount !== null && acvAmount > 0 ? acvAmount : null;
  const ladderStretchCap = acvAmount !== null && acvAmount > 0 ? Math.round(acvAmount * 1.5) : null;

  const [clause, setClause] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CLAUSE;
    const saved = window.localStorage.getItem(CLAUSE_STORAGE_KEY);
    return saved && saved.trim().length > 0 ? saved : DEFAULT_CLAUSE;
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
    if (searchParams.get('lolCap')) params.set('lolCap', searchParams.get('lolCap') as string);
    return params.toString();
  }, [acv, termMonths, insuranceCover, dataType, searchParams]);

  function runReview() {
    setResult(parseClause(clause));
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
  }

  function reset() {
    window.localStorage.removeItem(CLAUSE_STORAGE_KEY);
    setClause('');
    setResult(null);
  }

  const showOutsideCapWarning = result?.capInteraction === 'Potentially outside cap';

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <Link
            href="/deals/new"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            New review
          </Link>
        </div>

        <section className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Indemnities Review</h1>
          <p className="mt-2 text-zinc-400">
            Assess whether indemnity exposure is mutual, proportionate, and inside the liability cap.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {acvAmount !== null && acvAmount > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">ACV: {money(acvAmount)}</span>
            )}
            {termMonths && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Term: {termMonths} months</span>
            )}
            {insuranceCover && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Insurance: {money(Number(insuranceCover))}</span>
            )}
            {dataType && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Data: {dataType}</span>
            )}
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              {ladderBaseCap !== null ? `Liability cap: ${money(ladderBaseCap)}` : 'Liability cap: not provided'}
            </span>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Clause input</h2>
            <p className="text-xs text-zinc-400">
              Paste the indemnity wording here to assess trigger scope, mutuality, and whether it may sit outside the liability cap.
            </p>
          </div>
          <label htmlFor="indemnityClause" className="text-base font-semibold">
            Paste the indemnity clause
          </label>
          <textarea
            id="indemnityClause"
            rows={8}
            value={clause}
            onChange={(event) => setClause(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-black/40 p-4 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
            placeholder="Paste indemnity wording..."
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runReview}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
            >
              Run review
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Reset
            </button>
          </div>
        </section>

        {result && (
          <section className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ReviewCard label="Directionality" value={result.directionality} />
              <ReviewCard label="Trigger scope" value={result.triggerScope} />
              <ReviewCard label="Cap interaction" value={result.capInteraction} />
              <div className={`rounded-xl border p-4 ${riskClass(result.riskRating)}`}>
                <div className="text-xs uppercase tracking-wide">Risk rating</div>
                <div className="mt-2 text-base font-semibold">{result.riskRating}</div>
              </div>
            </div>

            {showOutsideCapWarning && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                <div className="text-sm font-semibold">Cross-clause warning</div>
                <p className="mt-1 text-sm">
                  This indemnity may override your liability cap and create effectively uncapped exposure.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <h3 className="text-base font-semibold">Detected from your clause</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Directionality</span>
                  <span className="font-medium">{result.directionality}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Trigger scope</span>
                  <span className="font-medium">{result.triggerScope}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Cap interaction</span>
                  <span className="font-medium">{result.capInteraction}</span>
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
                  label: 'Ask',
                  title: 'Mutual indemnities for IP infringement',
                  script: '“For IP infringement risk, we need this to be mutual so each side stands behind its own materials.”',
                },
                {
                  label: 'Narrowing',
                  title: 'Narrow broad indemnity triggers',
                  script: '“Let’s limit this to specific third-party IP and data claims, not all losses from any breach.”',
                },
                {
                  label: 'Fallback',
                  title:
                    ladderBaseCap !== null
                      ? `Keep indemnity inside a ${money(ladderBaseCap)} cap`
                      : 'Keep indemnity inside the liability cap',
                  script:
                    ladderBaseCap !== null
                      ? `“If broader language is required, this indemnity must stay inside a ${money(ladderBaseCap)} cap.${ladderStretchCap !== null ? ` If needed, we can stretch to ${money(ladderStretchCap)}.` : ''}”`
                      : '“If broader language is required, this indemnity must still sit inside the agreed liability cap.”',
                },
              ]}
            />
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/review/lol${queryString ? `?${queryString}` : ''}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Back
          </Link>
          <Link
            href={`/review/ip${queryString ? `?${queryString}` : ''}`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            Continue to IP Ownership
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function IndemnitiesReviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-6 text-white">Loading review…</main>}>
      <IndemnitiesReviewContent />
    </Suspense>
  );
}
