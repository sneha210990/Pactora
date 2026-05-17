'use client';

import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { clearPersistedState, useDocumentAnalysisActions } from '@/lib/document-analysis-store';

interface NewReviewButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function NewReviewButton({ className, children = 'New review' }: NewReviewButtonProps) {
  const router = useRouter();
  const { reset } = useDocumentAnalysisActions();

  function handleClick() {
    // Clear localStorage synchronously before navigating so that even a
    // hard reload during navigation won't restore stale contract data.
    clearPersistedState();
    sessionStorage.removeItem('pactora.manualClauseText');

    // Flush the in-memory store reset synchronously before router.push,
    // so the new page reads empty state from context on its first render.
    flushSync(() => {
      reset();
    });

    router.push('/deals/new');
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
