'use client';

import { useState } from 'react';
import { clearPersistedState } from '@/lib/document-analysis-store';

interface NewReviewButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function NewReviewButton({ className, children = 'New review' }: NewReviewButtonProps) {
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    clearPersistedState();
    sessionStorage.removeItem('pactora.manualClauseText');
    // Hard navigation so the React app re-initialises from scratch, avoiding
    // React 19 concurrent rendering races where the new page renders before
    // the in-memory reset propagates through the context tree.
    window.location.href = '/deals/new';
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-review-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-950 p-6 shadow-xl">
            <h2 id="new-review-dialog-title" className="text-base font-semibold text-white">
              Start a new review?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              This will clear your current analysis. Any unsaved redlines or notes will be lost.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
