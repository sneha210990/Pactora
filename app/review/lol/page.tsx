'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { trackEvent } from '@/components/track-event';
import { useSearchParams } from 'next/navigation';
import { NegotiationLadder } from '../components/negotiation-ladder';

type CapType =
  | 'fixed_amount'
  | 'fees_paid_window'
  | 'fees_payable_total'
  | 'fees_payable_window'
  | 'multiple_of_fees'
  | 'uncapped'
  | 'unknown';

type CapScope = 'aggregate' | 'per_claim' | 'unknown';

type CarveoutLabel =
  | 'confidentiality'
  | 'data_protection'
  | 'ip'
  | 'fraud'
  | 'wilful_misconduct'
  | 'gross_negligence'
  | 'injury_death'
  | 'payment_obligations';

type ParsedClauseResult = {
  capType: CapType;
  capAmountGBP?: number;
  capMultiple?: number;
  capWindowMonths?: number;
  capScope?: CapScope;
  exclusions?: string[];
  asymmetric?: boolean;
  carveoutsFound: CarveoutLabel[];
};

type DerivedResult = {
  impliedCapAmountGBP: number | null;
  capMultipleVsACV: number | null;
  badge: 'High risk' | 'Buyer-friendly' | 'Firm but common' | 'Seller-friendly';
};

const CLAUSE_STORAGE_KEY = 'pactora.lolClause';
const DEMO_LOL_CLAUSE =
  "Supplier's total aggregate liability under this Agreement shall not exceed the fees paid by Customer in the 12 months preceding the event giving rise to the claim. The foregoing cap shall not apply to fraud or wilful misconduct.";

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

function normalizeWhitespace(input: string) {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parseMoneyValue(raw: string) {
  const parsed = Number(raw.replace(/,/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function parseCapMultiple(normalizedClause: string) {
  const digitX = normalizedClause.match(/\b(\d+(?:\.\d+)?)\s*x\b/);
  if (digitX) return Number(digitX[1]);

  const digitTimes = normalizedClause.match(/\b(\d+(?:\.\d+)?)\s*(?:times?|x)\b/);
  if (digitTimes) return Number(digitTimes[1]);

  const wordMappings: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  };

  const wordParen = normalizedClause.match(/\b(one|two|three|four|five)\s*\((\d+)\)\s*times?\b/);
  if (wordParen) return Number(wordParen[2]);

  const wordTimes = normalizedClause.match(/\b(one|two|three|four|five)\s*times?\b/);
  if (wordTimes) return wordMappings[wordTimes[1]];

  return undefined;
}

function extractCapWindowMonths(normalizedClause: string) {
  const contextual = normalizedClause.match(
    /(?:preceding|prior|in the|during the|over the)\s+(\d{1,2})\s*months?/,
  );
  if (contextual) return Number(contextual[1]);

  const generic = normalizedClause.match(/(\d{1,2})\s*months?/);
  if (generic) return Number(generic[1]);

  if (/last year|previous year|prior year|preceding year/.test(normalizedClause)) {
    return 12;
  }

  return undefined;
}

function parseClause(clause: string): ParsedClauseResult {
  const normalizedClause = normalizeWhitespace(clause);

  if (!normalizedClause) {
    return {
      capType: 'unknown',
      capScope: 'unknown',
      exclusions: [],
      carveoutsFound: [],
      asymmetric: false,
    };
  }

  const result: ParsedClauseResult = {
    capType: 'unknown',
    capScope: 'unknown',
    exclusions: [],
    carveoutsFound: [],
    asymmetric: false,
  };

  if (/\bunlimited\b|\buncapped\b|without limit|no limit/.test(normalizedClause)) {
    result.capType = 'uncapped';
  }

  const poundMatch = normalizedClause.match(/£\s?(\d[\d,]*)/);
  const gbpMatch = normalizedClause.match(/(?:gbp|pounds?)\s?(\d[\d,]*)/);
  const moneyMatch = poundMatch?.[1] ?? gbpMatch?.[1];
  if (moneyMatch) {
    const parsedMoney = parseMoneyValue(moneyMatch);
    if (parsedMoney !== null) {
      result.capType = 'fixed_amount';
      result.capAmountGBP = parsedMoney;
    }
  }

  const hasFeesPaidPhrase =
    /fees paid|amounts paid|charges paid|fees actually paid/.test(normalizedClause);

  if (hasFeesPaidPhrase) {
    result.capType = 'fees_paid_window';
    const months = extractCapWindowMonths(normalizedClause);
    if (months !== undefined) {
      result.capWindowMonths = months;
    } else if (/last year|previous year|prior year|preceding year/.test(normalizedClause)) {
      result.capWindowMonths = 12;
    }
  }

  const hasFeesPayablePhrase =
    /fees payable|charges payable|total fees payable|contract value|total contract value/.test(
      normalizedClause,
    );

  if (hasFeesPayablePhrase) {
    const months = extractCapWindowMonths(normalizedClause);
    if (months !== undefined) {
      result.capType = 'fees_payable_window';
      result.capWindowMonths = months;
    } else {
      result.capType = 'fees_payable_total';
    }
  }

  const parsedMultiple = parseCapMultiple(normalizedClause);
  if (parsedMultiple !== undefined) {
    result.capType = 'multiple_of_fees';
    result.capMultiple = parsedMultiple;
  }

  if (/aggregate|total liability/.test(normalizedClause)) {
    result.capScope = 'aggregate';
  }
  if (/per claim|each claim/.test(normalizedClause)) {
    result.capScope = 'per_claim';
  }

  const exclusions = new Set<string>();
  if (/indirect/.test(normalizedClause)) exclusions.add('indirect');
  if (/consequential/.test(normalizedClause)) exclusions.add('consequential');
  if (/loss of profits|lost profits/.test(normalizedClause)) exclusions.add('lost_profits');
  result.exclusions = Array.from(exclusions);

  const overrideRegex =
    /does not apply|shall not apply|will not apply|notwithstanding|excluding|except|nothing in this agreement limits|without limitation/g;

  const carveoutMatchers: Array<{ label: CarveoutLabel; regex: RegExp }> = [
    { label: 'confidentiality', regex: /confidentiality|confidential/ },
    { label: 'data_protection', regex: /data protection|uk gdpr|gdpr|\bdpa\b|personal data/ },
    { label: 'ip', regex: /intellectual property|\bip\b|infringement/ },
    { label: 'fraud', regex: /fraud/ },
    { label: 'wilful_misconduct', regex: /wilful misconduct|willful misconduct/ },
    { label: 'gross_negligence', regex: /gross negligence/ },
    { label: 'injury_death', regex: /personal injury|death/ },
    {
      label: 'payment_obligations',
      regex: /payment obligations|(?:customer[^.]{0,80}fees)|(?:fees[^.]{0,80}customer)/,
    },
  ];

  const carveoutSet = new Set<CarveoutLabel>();
  let triggerMatch = overrideRegex.exec(normalizedClause);
  while (triggerMatch) {
    const start = triggerMatch.index;
    const segment = normalizedClause.slice(start, start + 300);
    carveoutMatchers.forEach(({ label, regex }) => {
      if (regex.test(segment)) {
        carveoutSet.add(label);
      }
    });
    triggerMatch = overrideRegex.exec(normalizedClause);
  }
  result.carveoutsFound = Array.from(carveoutSet);

  const paragraph = normalizedClause;
  const limitsVendor =
    /supplier|vendor|provider/.test(paragraph) &&
    /limited to|liability shall be limited|liability is limited/.test(paragraph);
  const limitsCustomer =
    /customer/.test(paragraph) &&
    /customer[^.]{0,120}(?:limited to|liability shall be limited|liability is limited)/.test(paragraph);
  result.asymmetric = limitsVendor && !limitsCustomer;

  return result;
}

function deriveFromDeal(parsed: ParsedClauseResult, acv: number, termMonths: number): DerivedResult {
  let impliedCapAmountGBP: number | null = null;

  switch (parsed.capType) {
    case 'fixed_amount':
      impliedCapAmountGBP = parsed.capAmountGBP ?? null;
      break;
    case 'fees_paid_window': {
      const months = parsed.capWindowMonths ?? 12;
      impliedCapAmountGBP = acv > 0 ? Math.round(acv * (months / 12)) : null;
      break;
    }
    case 'fees_payable_total':
      impliedCapAmountGBP = acv > 0 ? Math.round(acv * (termMonths / 12)) : null;
      break;
    case 'fees_payable_window': {
      const months = parsed.capWindowMonths ?? 12;
      impliedCapAmountGBP = acv > 0 ? Math.round(acv * (months / 12)) : null;
      break;
    }
    case 'multiple_of_fees':
      impliedCapAmountGBP = acv > 0 && parsed.capMultiple ? Math.round(acv * parsed.capMultiple) : null;
      break;
    case 'uncapped':
    case 'unknown':
      impliedCapAmountGBP = null;
      break;
  }

  const capMultipleVsACV = impliedCapAmountGBP !== null && acv > 0 ? impliedCapAmountGBP / acv : null;

  const highRiskCarveout = parsed.carveoutsFound.some((c) =>
    ['data_protection', 'ip', 'confidentiality'].includes(c),
  );

  let badge: DerivedResult['badge'] = 'Seller-friendly';
  if (parsed.capType === 'uncapped' || highRiskCarveout) {
    badge = 'High risk';
  } else if (capMultipleVsACV !== null && capMultipleVsACV < 1) {
    badge = 'Buyer-friendly';
  } else if (capMultipleVsACV !== null && capMultipleVsACV <= 2) {
    badge = 'Firm but common';
  }

  return {
    impliedCapAmountGBP,
    capMultipleVsACV,
    badge,
  };
}

function badgeClass(badge: DerivedResult['badge']) {
  if (badge === 'High risk') return 'bg-red-500/15 text-red-300';
  if (badge === 'Buyer-friendly') return 'bg-amber-500/15 text-amber-300';
  if (badge === 'Firm but common') return 'bg-emerald-500/15 text-emerald-300';
  return 'bg-blue-500/15 text-blue-300';
}

function labelForCapType(capType: CapType) {
  if (capType === 'fixed_amount') return 'Fixed amount';
  if (capType === 'fees_paid_window') return 'Fees paid (window)';
  if (capType === 'fees_payable_total') return 'Fees payable (total term)';
  if (capType === 'fees_payable_window') return 'Fees payable (window)';
  if (capType === 'multiple_of_fees') return 'Multiple of fees';
  if (capType === 'uncapped') return 'Uncapped';
  return 'Unknown';
}

function LolReviewContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    trackEvent('analysis_started', '/review/lol');
  }, []);

  const acv = num(searchParams.get('acv'), 25000);
  const termMonths = num(searchParams.get('termMonths'), 12);
  const insuranceCover = num(searchParams.get('insuranceCover'), 1000000);
  const dataType = str(searchParams.get('dataType'), 'standard');
  const queryClause = str(searchParams.get('lolClause'));

  const [clause, setClause] = useState(DEMO_LOL_CLAUSE);
  const [parsedResult, setParsedResult] = useState<ParsedClauseResult>(() => parseClause(DEMO_LOL_CLAUSE));

  useEffect(() => {
    const savedClause = window.localStorage.getItem(CLAUSE_STORAGE_KEY);
    const initialClause = savedClause || queryClause || DEMO_LOL_CLAUSE;
    setClause(initialClause);
    setParsedResult(parseClause(initialClause));
  }, [queryClause]);

  useEffect(() => {
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
  }, [clause]);

  const derived = useMemo(
    () => deriveFromDeal(parsedResult, acv, termMonths),
    [parsedResult, acv, termMonths],
  );

  const reviewQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('acv', String(acv));
    params.set('termMonths', String(termMonths));
    params.set('insuranceCover', String(insuranceCover));
    params.set('dataType', dataType);

    const explicitLolCap = searchParams.get('lolCap');
    if (explicitLolCap) {
      params.set('lolCap', explicitLolCap);
    } else if (derived.impliedCapAmountGBP !== null) {
      params.set('lolCap', String(derived.impliedCapAmountGBP));
    }

    return params.toString();
  }, [acv, termMonths, insuranceCover, dataType, searchParams, derived.impliedCapAmountGBP]);

  function runReview() {
    setParsedResult(parseClause(clause));
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
  }

  function resetClause() {
    window.localStorage.removeItem(CLAUSE_STORAGE_KEY);
    setClause(DEMO_LOL_CLAUSE);
    setParsedResult(parseClause(DEMO_LOL_CLAUSE));
  }

  const hasNarrowingItem = parsedResult.carveoutsFound.some((x) =>
    ['data_protection', 'ip', 'confidentiality'].includes(x),
  );

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
            New Deal
          </Link>
        </div>

        <div className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Limitation of Liability Review</h1>
          <p className="mt-2 text-zinc-400">
            Standard clause module pattern: exact detected clause text, editable review, deterministic analysis.
          </p>


          <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            Pactora provides decision-support for internal commercial review. Outputs may be incomplete
            or inaccurate and should be reviewed by a qualified human before material decisions are
            made.
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">ACV: {money(acv)}</span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              Term: {termMonths} months
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              Insurance: {money(insuranceCover)}
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Data: {dataType}</span>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Clause text panel</h2>
            <p className="text-xs text-zinc-400">Reusable for Indemnities, IP Ownership, Data Protection, and Termination.</p>
          </div>
          <label htmlFor="lolClause" className="text-base font-semibold">
            Detected clause text
          </label>
          <textarea
            id="lolClause"
            value={clause}
            onChange={(e) => setClause(e.target.value)}
            rows={8}
            className="mt-3 w-full rounded-lg border border-zinc-700 bg-black/40 p-3 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <p className="mt-2 text-xs text-zinc-400">You can edit the extracted clause if needed.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
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
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Reset clause
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <h2 className="text-lg font-semibold">Analysis panel</h2>
          <p className="mt-1 text-sm text-zinc-400">Results are always tied to the exact text currently in the textarea.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4 md:col-span-2">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-semibold">Overall commercial reasonableness</h3>
                <span className={`rounded-full px-3 py-1 text-xs ${badgeClass(derived.badge)}`}>{derived.badge}</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <h3 className="text-base font-semibold">Detected from your clause</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Cap type</span>
                  <span className="font-medium">{labelForCapType(parsedResult.capType)}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Estimated cap</span>
                  <span className="font-medium">
                    {derived.impliedCapAmountGBP !== null ? money(derived.impliedCapAmountGBP) : 'Not estimated'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Cap multiple vs ACV</span>
                  <span className="font-medium">
                    {derived.capMultipleVsACV !== null ? `${derived.capMultipleVsACV.toFixed(2)}×` : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Scope</span>
                  <span className="font-medium">{parsedResult.capScope ?? 'unknown'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Asymmetric</span>
                  <span className="font-medium">{parsedResult.asymmetric ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Exclusions</span>
                  <span className="font-medium">
                    {parsedResult.exclusions && parsedResult.exclusions.length > 0
                      ? parsedResult.exclusions.join(', ')
                      : 'None detected'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
              <h3 className="text-base font-semibold">Carve-outs to watch</h3>
              {parsedResult.carveoutsFound.length > 0 ? (
                <ul className="mt-3 space-y-3 text-sm">
                  {parsedResult.carveoutsFound.map((x) => (
                    <li key={x} className="flex gap-3 rounded-lg border border-zinc-800 bg-black/30 p-3">
                      <span className="mt-0.5 text-amber-300">⚠</span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 rounded-lg border border-zinc-800 bg-black/30 p-3 text-sm text-zinc-300">
                  No carve-out overrides detected from the current clause text.
                </div>
              )}
            </div>

            <NegotiationLadder
              className="md:col-span-2"
              title="Negotiation fallback ladder"
              items={[
                {
                  label: 'Ask',
                  title: 'Cap at 1× ACV',
                  script: `“We can do a cap of ${money(acv)}.”`,
                },
                {
                  label: 'Fallback',
                  title: 'Cap at 1.5× ACV',
                  script: `“If needed, we can stretch to ${money(Math.round(acv * 1.5))}.”`,
                },
                hasNarrowingItem
                  ? {
                      label: 'Narrowing',
                      title: 'Cap applies to carve-outs except fraud/wilful misconduct',
                      script:
                        '“We can only accept carve-outs if they remain within the cap, except fraud and wilful misconduct.”',
                    }
                  : {
                      label: 'Fallback',
                      title: 'Cap at 2× ACV',
                      script: `“Final position is ${money(acv * 2)}.”`,
                    },
              ]}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/review/indemnities?${reviewQuery}`}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
            >
              Continue to Indemnities
            </Link>
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
