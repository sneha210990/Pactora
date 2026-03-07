'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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

function SummaryContent() {
  const searchParams = useSearchParams();

  const acv = searchParams.get('acv');
  const termMonths = searchParams.get('termMonths');
  const insuranceCover = searchParams.get('insuranceCover');
  const dataType = searchParams.get('dataType');
  const lolCapParam = searchParams.get('lolCap');

  const acvAmount = num(acv);
  const insuranceAmount = num(insuranceCover);
  const lolCap = num(lolCapParam);

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
          <h1 className="text-4xl font-semibold tracking-tight">Deal Summary</h1>
          <p className="mt-2 text-zinc-400">A final view of the commercial and legal risk across the contract.</p>

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

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Overall risk</h2>
            <p className="mt-2 text-zinc-200">Placeholder: consolidated risk score across LoL, indemnities, IP, data protection, and termination.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Key negotiation priorities</h2>
            <p className="mt-2 text-zinc-200">Placeholder: top priorities to discuss before signature based on all review pages.</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Next: consolidated negotiation email</h2>
            <p className="mt-2 text-zinc-200">Coming soon: generate a founder-ready negotiation email that consolidates major asks.</p>
          </div>
        </section>

        <div className="mt-8">
          <Link href="/" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-6 text-white">Loading summary…</main>}>
      <SummaryContent />
    </Suspense>
  );
}
