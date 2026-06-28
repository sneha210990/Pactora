import Link from 'next/link';
import type { Metadata } from 'next';
import { CLAUSE_GUIDES, AUTHOR_ATTRIBUTION } from '@/lib/clause-guide-content';

export const metadata: Metadata = {
  title: 'Clause Library — Pactora',
  description:
    'Plain-English guides to the five key clauses in UK commercial contracts — written by a qualified lawyer.',
};

export default function ClausesIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <div className="mb-10">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Reference
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
          Clause library
        </h1>
        <p className="text-lg leading-relaxed text-zinc-400">
          Plain-English guides to the five clauses that matter most in UK commercial contracts.
        </p>
      </div>

      <div className="mb-10 rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 py-4">
        <p className="text-xs leading-relaxed text-zinc-500">{AUTHOR_ATTRIBUTION}</p>
      </div>

      <div className="space-y-3">
        {CLAUSE_GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/clauses/${guide.slug}`}
            className="group flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-5 transition hover:border-zinc-600 hover:bg-zinc-900"
          >
            <div className="min-w-0">
              <p className="text-base font-semibold text-zinc-100 group-hover:text-white">
                {guide.clauseName}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                {guide.heroSummary}
              </p>
            </div>
            <svg
              className="h-4 w-4 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-300"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="mb-2 text-base font-semibold text-zinc-100">
          Ready to check your contract?
        </h2>
        <p className="mb-5 text-sm text-zinc-400">
          Upload your contract and Pactora will flag issues across all five clause types instantly.
        </p>
        <Link
          href="/deals/new"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
        >
          Analyse my contract free
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </main>
  );
}
