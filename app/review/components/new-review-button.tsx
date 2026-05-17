'use client';

import { useRouter } from 'next/navigation';
import { useDocumentAnalysisActions } from '@/lib/document-analysis-store';

interface NewReviewButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function NewReviewButton({ className, children = 'New review' }: NewReviewButtonProps) {
  const router = useRouter();
  const { reset } = useDocumentAnalysisActions();

  function handleClick() {
    reset();
    sessionStorage.removeItem('pactora.manualClauseText');
    router.push('/deals/new');
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
