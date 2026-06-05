'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDocumentAnalysisActions } from '@/lib/document-analysis-store';
import type { DbDeal } from '@/lib/supabase-db';

export default function DealPermalinkPage({ params }: { params: Promise<{ id: string }> }) {
  const actions = useDocumentAnalysisActions();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(({ id }) =>
      fetch(`/api/deals/${id}`)
        .then((res) => res.json() as Promise<{ deal?: DbDeal; error?: string }>)
        .then(({ deal, error: err }) => {
          if (!deal) { setError(err ?? 'Deal not found.'); return; }
          actions.restoreState(deal.snapshot);
          router.replace('/review/summary');
        })
        .catch(() => setError('Failed to load deal.')),
    );
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-zinc-400">{error}</p>
          <a href="/deals" className="mt-4 inline-block text-sm text-zinc-500 underline hover:text-zinc-300">
            ← Back to your deals
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <p className="text-sm text-zinc-500">Loading your analysis…</p>
    </main>
  );
}
