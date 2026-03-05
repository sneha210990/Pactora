'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

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

const TEST_CLAUSES: Record<string, string> = {
  fixedWithCarveouts:
    'Supplier\'s total aggregate liability under this Agreement shall not exceed £100,000. The foregoing cap shall not apply to confidentiality obligations, data protection obligations under UK GDPR, or breaches involving personal data.',
  feesPaid12Months:
    'Each party\'s total liability in aggregate shall be limited to the fees paid by Customer in the 12 months preceding the event giving rise to the claim. Neither party shall be liable for indirect or consequential damages, including loss of profits.',
  twoXFraudOnly:
    'Provider\'s total liability shall be limited to two (2) times the fees payable under this Agreement. This limitation shall not apply to fraud.',
};

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

<<<<<<< HEAD
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
  const limitsVendor = /supplier|vendor|provider/.test(paragraph) &&
    /limited to|liability shall be limited|liability is limited/.test(paragraph);
  const limitsCustomer = /customer/.test(paragraph) &&
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

  const acv = num(searchParams.get('acv'), 25000);
  const termMonths = num(searchParams.get('termMonths'), 12);
  const insuranceCover = num(searchParams.get('insuranceCover'), 1000000);
  const dataType = str(searchParams.get('dataType'), 'standard');

  const [clause, setClause] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedClauseResult>(() => parseClause(''));

  useEffect(() => {
    const savedClause = window.localStorage.getItem(CLAUSE_STORAGE_KEY) ?? '';
    setClause(savedClause);
  }, []);

  const derived = useMemo(() => deriveFromDeal(parsedResult, acv, termMonths), [parsedResult, acv, termMonths]);

  function runReview() {
    const parsed = parseClause(clause);
    setParsedResult(parsed);
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
  }

  function resetClause() {
    window.localStorage.removeItem(CLAUSE_STORAGE_KEY);
    setClause('');
    setParsedResult(parseClause(''));
  }

  function loadTestClause(testClause: string) {
    setClause(testClause);
    const parsed = parseClause(testClause);
    setParsedResult(parsed);
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, testClause);
  }

  const hasNarrowingItem = parsedResult.carveoutsFound.some((x) =>
    ['data_protection', 'ip', 'confidentiality'].includes(x),
  );
=======
export default function LolReviewPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const sp = searchParams ?? {};

  const acv = num(sp.acv, 25000);
  const termMonths = num(sp.termMonths, 12);
  const insuranceCover = num(sp.insuranceCover, 1000000);
  const dataType = str(sp.dataType, "standard");

  const cap = acv;
  const capMultiple = acv > 0 ? (cap / acv).toFixed(1) : "—";
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
<<<<<<< HEAD
          <Link
            href="/deals/new"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            New Deal
          </Link>
=======

          <div className="flex gap-3">
            <Link
              href="/deals/new"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              New Deal
            </Link>
            <Link
              href="/"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Landing
            </Link>
          </div>
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)
        </div>

        <div className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Limitation of Liability Review</h1>
          <p className="mt-2 text-zinc-400">
            Paste the clause below and run deterministic lawyer-logic against your deal context.
          </p>

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
              className="text-sm text-zinc-300 underline-offset-2 hover:text-white hover:underline"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => loadTestClause(TEST_CLAUSES.fixedWithCarveouts)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
            >
              Test clause: £ cap + GDPR/confidentiality
            </button>
            <button
              type="button"
              onClick={() => loadTestClause(TEST_CLAUSES.feesPaid12Months)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
            >
              Test clause: fees paid (12 months)
            </button>
            <button
              type="button"
              onClick={() => loadTestClause(TEST_CLAUSES.twoXFraudOnly)}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900"
            >
              Test clause: 2x fees + fraud
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
<<<<<<< HEAD
                <h2 className="text-lg font-semibold">Detected from your clause</h2>
                <p className="mt-1 text-sm text-zinc-400">Derived from deterministic parsing and deal math.</p>
=======
                <h2 className="text-lg font-semibold">Overall view</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Demo output (we’ll wire extraction later).
                </p>
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)
              </div>
              <span className={`rounded-full px-3 py-1 text-xs ${badgeClass(derived.badge)}`}>{derived.badge}</span>
            </div>

            <div className="mt-4 space-y-3 text-sm">
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

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-lg font-semibold">Carve-outs to watch</h2>
            <p className="mt-1 text-sm text-zinc-400">Detected only from override context in your clause text.</p>

<<<<<<< HEAD
            {parsedResult.carveoutsFound.length > 0 ? (
              <ul className="mt-4 space-y-3 text-sm">
                {parsedResult.carveoutsFound.map((x) => (
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
=======
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Data protection / GDPR indemnities (often uncapped)",
                "Confidentiality breaches (sometimes uncapped)",
                "IP infringement (may sit outside cap)",
                "Gross negligence / wilful misconduct (broad definitions)",
              ].map((x) => (
                <li
                  key={x}
                  className="flex gap-3 rounded-lg border border-zinc-800 bg-black/30 p-3"
                >
                  <span className="mt-0.5 text-amber-300">⚠</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 md:col-span-2">
            <h2 className="text-lg font-semibold">Negotiation fallbacks</h2>
<<<<<<< HEAD
            <p className="mt-1 text-sm text-zinc-400">A practical ladder based on what was detected.</p>
=======
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)

            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Ask</div>
                <div className="mt-1 font-medium">Cap at 1× ACV</div>
                <div className="mt-2 text-zinc-300">“We can do a cap of {money(acv)}.”</div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Fallback</div>
                <div className="mt-1 font-medium">Cap at 1.5× ACV</div>
                <div className="mt-2 text-zinc-300">“If needed, we can stretch to {money(Math.round(acv * 1.5))}.”</div>
              </div>

<<<<<<< HEAD
              {hasNarrowingItem ? (
                <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                  <div className="text-xs text-zinc-400">Narrowing</div>
                  <div className="mt-1 font-medium">Cap applies to carve-outs except fraud/wilful misconduct</div>
                  <div className="mt-2 text-zinc-300">
                    “We can only accept carve-outs if they remain within the cap, except fraud and wilful misconduct.”
                  </div>
=======
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Structure</div>
                <div className="mt-1 font-medium">Carve-outs must be narrow</div>
                <div className="mt-2 text-zinc-300">
                  “We’ll accept carve-outs only for fraud and deliberate
                  misconduct.”
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                  <div className="text-xs text-zinc-400">Fallback</div>
                  <div className="mt-1 font-medium">Cap at 2× ACV</div>
                  <div className="mt-2 text-zinc-300">“Final position is {money(acv * 2)}.”</div>
                </div>
              )}
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
<<<<<<< HEAD
}

export default function LolReviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-6 text-white">Loading review…</main>}>
      <LolReviewContent />
    </Suspense>
  );
}
=======
}
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)
