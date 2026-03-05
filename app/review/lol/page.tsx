'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

type CapType = 'fees_paid_window' | 'fixed_amount' | 'fee_multiple' | 'unknown';

type ReviewResult = {
  capType: CapType;
  capAmount: number | null;
  capMultiple: number | null;
  monthsWindow: number | null;
  carveouts: string[];
  overallBadge: string;
};

const CLAUSE_STORAGE_KEY = 'pactora.lolClause';

function num(value: string | null, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: string | null, fallback = '') {
  return value && value.length > 0 ? value : fallback;
}

function money(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}

function normalizeNumber(raw: string) {
  const cleaned = raw.replace(/[,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseClause(clause: string, acv: number): ReviewResult {
  const lower = clause.toLowerCase();

  const monthsWindowMatch = lower.match(/(?:in|during|over)\s+the\s+(\d{1,2})\s+months?/);
  const monthsWindow = monthsWindowMatch ? Number(monthsWindowMatch[1]) : null;

  const hasFeesPaidPattern =
    /fees paid|fees payable|amounts paid|charges paid/.test(lower) || monthsWindow !== null;

  const fixedAmountMatch = clause.match(/(?:£|gbp\s*)(\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/i);
  const fixedAmount = fixedAmountMatch ? normalizeNumber(fixedAmountMatch[1]) : null;

  const hasFeeMultipleKeyword = /contract value|total fees|annual fees|1x\s*fees?/.test(lower);
  const multipleMatch = lower.match(/(\d+(?:\.\d+)?)\s*x\s*(?:the\s*)?(?:fees?|acv|annual fees?|total fees?|contract value)/);
  const explicitMultiple = multipleMatch ? Number(multipleMatch[1]) : null;

  let capType: CapType = 'unknown';
  let capAmount: number | null = null;

  if (hasFeesPaidPattern) {
    capType = 'fees_paid_window';
  } else if (fixedAmount !== null) {
    capType = 'fixed_amount';
    capAmount = fixedAmount;
  } else if (hasFeeMultipleKeyword) {
    capType = 'fee_multiple';
    if (explicitMultiple !== null && acv > 0) {
      capAmount = explicitMultiple * acv;
    }
  }

  if (capType === 'fees_paid_window' && monthsWindow !== null && acv > 0) {
    capAmount = Math.round((acv * monthsWindow) / 12);
  }

  if (capType === 'fee_multiple' && explicitMultiple === null && /annual fees/.test(lower) && acv > 0) {
    capAmount = acv;
  }

  const overridePhrases = ['does not apply', 'shall not apply', 'excluding', 'except', 'notwithstanding'];
  const hasOverridePhrase = overridePhrases.some((phrase) => lower.includes(phrase));

  const carveoutMatchers: Array<{ label: string; regex: RegExp }> = [
    { label: 'Confidentiality', regex: /confidentiality|confidential information/ },
    { label: 'Data protection / GDPR', regex: /data protection|gdpr|uk gdpr|privacy/ },
    { label: 'IP / intellectual property', regex: /intellectual property|\bip\b/ },
    { label: 'Infringement', regex: /infringement/ },
    { label: 'Fraud', regex: /fraud|fraudulent/ },
    { label: 'Wilful misconduct', regex: /wilful misconduct|willful misconduct/ },
    { label: 'Gross negligence', regex: /gross negligence/ },
  ];

  const carveouts = hasOverridePhrase
    ? carveoutMatchers.filter(({ regex }) => regex.test(lower)).map(({ label }) => label)
    : [];

  const capMultiple = capAmount !== null && acv > 0 ? capAmount / acv : null;

  let overallBadge = 'Seller-friendly';
  if (carveouts.length > 0) {
    overallBadge = 'High risk';
  } else if (capMultiple !== null && capMultiple < 1) {
    overallBadge = 'Aggressive / buyer-friendly';
  } else if (capMultiple !== null && capMultiple <= 2) {
    overallBadge = 'Firm but common';
  }

  return {
    capType,
    capAmount,
    capMultiple,
    monthsWindow,
    carveouts,
    overallBadge,
  };
}

function badgeClass(badge: string) {
  if (badge === 'High risk') return 'bg-red-500/15 text-red-300';
  if (badge === 'Aggressive / buyer-friendly') return 'bg-amber-500/15 text-amber-300';
  if (badge === 'Firm but common') return 'bg-emerald-500/15 text-emerald-300';
  return 'bg-blue-500/15 text-blue-300';
}

function capTypeLabel(capType: CapType) {
  if (capType === 'fees_paid_window') return 'Fees paid / payable window';
  if (capType === 'fixed_amount') return 'Fixed amount';
  if (capType === 'fee_multiple') return 'Fee multiple';
  return 'Unknown';
}

function LolReviewContent() {
  const searchParams = useSearchParams();

  const acv = num(searchParams.get('acv'), 25000);
  const termMonths = num(searchParams.get('termMonths'), 12);
  const insuranceCover = num(searchParams.get('insuranceCover'), 1000000);
  const dataType = str(searchParams.get('dataType'), 'standard');

  const [clause, setClause] = useState('');
  const [reviewResult, setReviewResult] = useState<ReviewResult>(() => parseClause('', acv));

  useEffect(() => {
    const savedClause = window.localStorage.getItem(CLAUSE_STORAGE_KEY);
    if (savedClause) {
      setClause(savedClause);
    }
  }, []);

  useEffect(() => {
    setReviewResult(parseClause(clause, acv));
  }, [acv, clause]);

  const practicalExposure = useMemo(() => {
    if (reviewResult.carveouts.length > 0) return 'High';
    if (reviewResult.capMultiple !== null && reviewResult.capMultiple < 1) return 'Low';
    if (reviewResult.capMultiple !== null && reviewResult.capMultiple <= 2) return 'Medium';
    return 'Medium-High';
  }, [reviewResult.capMultiple, reviewResult.carveouts.length]);

  function runReview() {
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
    setReviewResult(parseClause(clause, acv));
  }

  function resetClause() {
    window.localStorage.removeItem(CLAUSE_STORAGE_KEY);
    setClause('');
    setReviewResult(parseClause('', acv));
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <div className="flex gap-3">
            <Link
              href="/deals/new"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              New Deal
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Limitation of Liability Review</h1>
          <p className="mt-2 text-zinc-400">
            Paste the clause below and run a deterministic review against your deal context.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              ACV: {money(acv)}
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              Term: {termMonths} months
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              Insurance: {money(insuranceCover)}
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              Data: {dataType}
            </span>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <label htmlFor="lolClause" className="text-base font-semibold">
            Paste the Limitation of Liability clause
          </label>
          <textarea
            id="lolClause"
            value={clause}
            onChange={(e) => setClause(e.target.value)}
            rows={8}
            placeholder="Paste full Limitation of Liability clause text here..."
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-black/40 p-3 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={runReview}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Run review
            </button>
            <button
              type="button"
              onClick={resetClause}
              className="text-sm text-zinc-300 underline-offset-2 hover:text-white hover:underline"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Overall view</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Scored from detected cap type, implied cap multiple, and carve-out overrides.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${badgeClass(reviewResult.overallBadge)}`}>
                {reviewResult.overallBadge}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Detected cap type</span>
                <span className="font-medium">{capTypeLabel(reviewResult.capType)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Cap</span>
                <span className="font-medium">
                  {reviewResult.capAmount !== null ? money(reviewResult.capAmount) : 'Not detected'}
                  {reviewResult.capMultiple !== null ? ` (~${reviewResult.capMultiple.toFixed(2)}× ACV)` : ''}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Fees window</span>
                <span className="font-medium">
                  {reviewResult.monthsWindow !== null ? `${reviewResult.monthsWindow} months` : 'Not detected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Practical exposure</span>
                <span className="font-medium">{practicalExposure}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-lg font-semibold">Carve-outs to watch</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Triggered when override wording appears with key uncapped-risk categories.
            </p>

            {reviewResult.carveouts.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm">
                {reviewResult.carveouts.map((x) => (
                  <li key={x} className="flex gap-3 rounded-lg border border-zinc-800 bg-black/30 p-3">
                    <span className="mt-0.5 text-amber-300">⚠</span>
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-black/30 p-3 text-sm text-zinc-300">
                No carve-out overrides detected from the current clause text.
              </div>
            )}

            <div className="mt-4 rounded-lg border border-zinc-800 bg-black/30 p-3 text-sm text-zinc-300">
              If the clause says <span className="text-white">“cap does not apply to …”</span> and names a
              category (e.g. GDPR/IP/fraud), treat that area as potentially uncapped.
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 md:col-span-2">
            <h2 className="text-lg font-semibold">Negotiation fallbacks</h2>
            <p className="mt-1 text-sm text-zinc-400">
              A simple ladder a founder can actually use on a call.
            </p>

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Ask</div>
                <div className="mt-1 font-medium">Cap at 1× ACV</div>
                <div className="mt-2 text-zinc-300">
                  “We can’t accept uncapped exposure. We can do a cap of {money(acv)}.”
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Fallback</div>
                <div className="mt-1 font-medium">Cap at 1.5× ACV</div>
                <div className="mt-2 text-zinc-300">
                  “If that doesn’t work, we can stretch to {money(Math.round(acv * 1.5))}.”
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Structure</div>
                <div className="mt-1 font-medium">Carve-outs must be narrow</div>
                <div className="mt-2 text-zinc-300">
                  “We’ll accept carve-outs only for fraud and deliberate misconduct — not broad categories
                  like ‘data’.”
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/deals/new"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Back to New Deal
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                Back to Landing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LolReviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-6 text-white">Loading review…</main>}>
      <LolReviewContent />
    </Suspense>
  );
}
