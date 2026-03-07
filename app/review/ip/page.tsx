'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NegotiationLadder } from '../components/negotiation-ladder';

type OwnershipStructure = 'Vendor owns' | 'Customer owns' | 'Shared/retained ownership' | 'Unknown';
type LicenceModel = 'Limited licence' | 'Perpetual/Broad licence' | 'Broad licence' | 'Unknown';
type StrategicRisk = 'Low' | 'Medium' | 'High';
type RiskRating = 'Low' | 'Medium' | 'High';

type ReviewResult = {
  ownershipStructure: OwnershipStructure;
  licenceModel: LicenceModel;
  strategicRisk: StrategicRisk;
  riskRating: RiskRating;
  redFlags: string[];
};

const CLAUSE_STORAGE_KEY = 'pactora.ipClause';

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

function parseOwnershipStructure(text: string): OwnershipStructure {
  const hasVestLanguage = text.includes('all intellectual property rights shall vest in');

  if (hasVestLanguage && /(vendor|provider|supplier)/.test(text)) {
    return 'Vendor owns';
  }

  if (hasVestLanguage && /(customer|client)/.test(text)) {
    return 'Customer owns';
  }

  if (text.includes('each party retains ownership') || text.includes('retains all right, title and interest')) {
    return 'Shared/retained ownership';
  }

  return 'Unknown';
}

function parseLicenceModel(text: string): LicenceModel {
  if (/(perpetual|irrevocable|worldwide)/.test(text)) {
    return 'Perpetual/Broad licence';
  }

  if (/(sublicensable|transferable|assignable)/.test(text)) {
    return 'Broad licence';
  }

  if (/(non-exclusive|limited|for internal business purposes)/.test(text)) {
    return 'Limited licence';
  }

  return 'Unknown';
}

function deriveStrategicRisk(ownershipStructure: OwnershipStructure, licenceModel: LicenceModel): StrategicRisk {
  const ownershipTransferBroadly = ownershipStructure === 'Vendor owns' || ownershipStructure === 'Customer owns';
  const perpetualOrBroad = licenceModel === 'Perpetual/Broad licence' || licenceModel === 'Broad licence';

  if (ownershipTransferBroadly || perpetualOrBroad) {
    return 'High';
  }

  if (ownershipStructure === 'Shared/retained ownership' && licenceModel === 'Limited licence') {
    return 'Low';
  }

  return 'Medium';
}

function deriveRiskRating(ownershipStructure: OwnershipStructure, licenceModel: LicenceModel): RiskRating {
  const broadAssignment = ownershipStructure === 'Vendor owns' || ownershipStructure === 'Customer owns';
  const broadOrPerpetualLicence = licenceModel === 'Perpetual/Broad licence' || licenceModel === 'Broad licence';

  if (broadAssignment || broadOrPerpetualLicence) {
    return 'High';
  }

  if (ownershipStructure === 'Shared/retained ownership' && licenceModel === 'Limited licence') {
    return 'Low';
  }

  return 'Medium';
}

function deriveRedFlags(text: string, ownershipStructure: OwnershipStructure, licenceModel: LicenceModel): string[] {
  const flags: string[] = [];

  if (ownershipStructure === 'Vendor owns' || ownershipStructure === 'Customer owns') {
    flags.push('Broad IP ownership assignment language detected.');
  }

  if (licenceModel === 'Perpetual/Broad licence' || /perpetual|irrevocable/.test(text)) {
    flags.push('Perpetual or hard-to-terminate licence rights detected.');
  }

  if (licenceModel === 'Broad licence' || /(sublicensable|transferable|assignable|worldwide)/.test(text)) {
    flags.push('Broad usage rights extend beyond a narrow service purpose.');
  }

  return flags;
}

function parseClause(clause: string): ReviewResult {
  const text = normalize(clause);
  const ownershipStructure = parseOwnershipStructure(text);
  const licenceModel = parseLicenceModel(text);
  const strategicRisk = deriveStrategicRisk(ownershipStructure, licenceModel);
  const riskRating = deriveRiskRating(ownershipStructure, licenceModel);
  const redFlags = deriveRedFlags(text, ownershipStructure, licenceModel);

  return {
    ownershipStructure,
    licenceModel,
    strategicRisk,
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

function IpOwnershipReviewContent() {
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

  const showWarning =
    result &&
    (result.ownershipStructure === 'Vendor owns' ||
      result.ownershipStructure === 'Customer owns' ||
      result.licenceModel === 'Perpetual/Broad licence' ||
      result.licenceModel === 'Broad licence');

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
          <h1 className="text-4xl font-semibold tracking-tight">IP Ownership Review</h1>
          <p className="mt-2 text-zinc-400">
            Assess whether ownership, licensing, and usage rights create commercial or strategic risk.
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
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Liability cap: {money(lolCap)}</span>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Clause input</h2>
            <p className="text-xs text-zinc-400">
              Paste the IP / ownership wording here to assess assignment risk, licence scope, and vendor/customer rights.
            </p>
          </div>
          <label htmlFor="ipClause" className="text-base font-semibold">
            Paste the IP ownership clause
          </label>
          <textarea
            id="ipClause"
            rows={8}
            value={clause}
            onChange={(event) => setClause(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-black/40 p-4 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
            placeholder="Paste IP ownership wording..."
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
              <ReviewCard label="Ownership structure" value={result.ownershipStructure} />
              <ReviewCard label="Licence model" value={result.licenceModel} />
              <ReviewCard label="Strategic risk" value={result.strategicRisk} />
              <div className={`rounded-xl border p-4 ${riskClass(result.riskRating)}`}>
                <div className="text-xs uppercase tracking-wide">Risk rating</div>
                <div className="mt-2 text-base font-semibold">{result.riskRating}</div>
              </div>
            </div>

            {showWarning && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                <div className="text-sm font-semibold">IP ownership warning</div>
                <p className="mt-1 text-sm">
                  This clause may transfer ownership or grant broader usage rights than expected.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <h3 className="text-base font-semibold">Detected from your clause</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Ownership structure</span>
                  <span className="font-medium">{result.ownershipStructure}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Licence model</span>
                  <span className="font-medium">{result.licenceModel}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Strategic risk</span>
                  <span className="font-medium">{result.strategicRisk}</span>
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
                  title: 'Retain ownership of pre-existing IP',
                  script:
                    '“Each party should retain ownership of its pre-existing IP and materials created independently of this agreement.”',
                },
                {
                  label: 'Position 2',
                  title: 'Narrow licence scope to service use only',
                  script:
                    '“Any licence should be limited to using the service for contract purposes, not for unrelated exploitation.”',
                },
                {
                  label: 'Position 3',
                  title: 'Avoid broad perpetual or sublicensable rights unless necessary',
                  script:
                    '“Perpetual, sublicensable, or transferable rights should be removed unless there is a specific operational need.”',
                },
                {
                  label: 'Position 4',
                  title: 'If customer insists, keep rights limited and revocable',
                  script:
                    '“If extended rights are required, they should be limited, revocable, and expressly tied to the contract purpose.”',
                },
              ]}
            />
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/review/indemnities${queryString ? `?${queryString}` : ''}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Back
          </Link>
          <Link
            href={`/review/data${queryString ? `?${queryString}` : ''}`}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            Continue to Data Protection
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function IpOwnershipReviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-6 text-white">Loading review…</main>}>
      <IpOwnershipReviewContent />
    </Suspense>
  );
}
