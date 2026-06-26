'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const DISMISSED_KEY = 'beta_banner_dismissed';

export function BetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative z-50 bg-violet-600 px-4 py-2 text-center text-sm text-white">
      <span className="font-medium">Pactora is in beta</span>
      {' — '}
      <span className="text-violet-200">expect rough edges. </span>
      <Link href="/feedback" className="underline underline-offset-2 hover:text-violet-100">
        Share your feedback
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss beta banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-200 hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
