'use client';

import { clearPersistedState } from '@/lib/document-analysis-store';

interface NewReviewButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function NewReviewButton({ className, children = 'New review' }: NewReviewButtonProps) {
  function handleClick() {
    // Clear persisted state synchronously, then do a hard navigation so the
    // React app re-initialises from scratch. This avoids any React 19 concurrent
    // rendering race where the new page renders before the in-memory reset
    // propagates through the context tree.
    clearPersistedState();
    sessionStorage.removeItem('pactora.manualClauseText');
    window.location.href = '/deals/new';
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
