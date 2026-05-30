'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import type { EmailFlag } from '@/lib/email/analysis-email';

export type { EmailFlag };

type AnalysisPayload = {
  riskScore: number;
  verdict: string;
  verdictDetail: string;
  flags: EmailFlag[];
};

const DISMISSED_KEY = 'email_capture_dismissed';

export function EmailCaptureBanner({ analysisPayload }: { analysisPayload?: AnalysisPayload }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionStorage.getItem(DISMISSED_KEY)) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await apiFetch('/api/capture-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...analysisPayload }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
      } else {
        setSubmitted(true);
        sessionStorage.setItem(DISMISSED_KEY, '1');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">
      {submitted ? (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-200">Report sent</p>
            <p className="mt-1 text-sm text-zinc-400">Check your inbox — your full analysis is on its way.</p>
          </div>
          <button onClick={dismiss} className="shrink-0 text-zinc-500 hover:text-zinc-300" aria-label="Dismiss">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-200">Save your analysis</p>
              <p className="mt-1 text-sm text-zinc-400">
                Get this analysis in your inbox, plus negotiation tips for each flagged clause.
              </p>
            </div>
            <button onClick={dismiss} className="shrink-0 text-zinc-500 hover:text-zinc-300" aria-label="Dismiss">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="shrink-0 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {submitting ? 'Sending…' : 'Send report'}
            </button>
          </form>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
