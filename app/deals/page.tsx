'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { listDeals, type DealHistoryEntry } from '@/lib/deals-history';
import { useDocumentAnalysisActions } from '@/lib/document-analysis-store';

export default function DealsPage() {
  const [deals, setDeals] = useState<DealHistoryEntry[]>([]);
  const actions = useDocumentAnalysisActions();
  const router = useRouter();

  useEffect(() => {
    setDeals(listDeals());
  }, []);

  function openDeal(deal: DealHistoryEntry) {
    actions.restoreState(deal.snapshot);
    router.push('/review/summary');
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Your deals</h1>
            <p className="mt-2 text-sm text-zinc-400">Past contract reviews, stored on this device.</p>
          </div>
          <Link
            href="/deals/new"
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            + New review
          </Link>
        </div>

        {deals.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-8 py-16 text-center">
            <p className="text-sm font-medium text-zinc-300">No reviews yet</p>
            <p className="mt-2 text-sm text-zinc-500">Upload a contract to get started.</p>
            <Link
              href="/deals/new"
              className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Review a contract
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {deals.map((deal) => (
              <button
                key={deal.id}
                onClick={() => openDeal(deal)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{deal.fileName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {new Date(deal.analyzedAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' · '}
                      {deal.clauseCount} clause{deal.clauseCount !== 1 ? 's' : ''} reviewed
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {deal.riskCounts.high > 0 && (
                      <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-400">
                        {deal.riskCounts.high} High
                      </span>
                    )}
                    {deal.riskCounts.medium > 0 && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-400">
                        {deal.riskCounts.medium} Med
                      </span>
                    )}
                    {deal.riskCounts.low > 0 && (
                      <span className="rounded-full bg-zinc-700/50 px-2.5 py-1 text-xs font-medium text-zinc-400">
                        {deal.riskCounts.low} Low
                      </span>
                    )}
                    <svg
                      className="h-4 w-4 text-zinc-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
