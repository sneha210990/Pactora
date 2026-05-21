'use client';

import { useState } from 'react';

type Status = 'idle' | 'loading' | 'done' | 'error';

type Props = {
  clauseText: string;
  clauseType: string;
  acv?: number | null;
  liabilityCap?: number | null;
  className?: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy redline to clipboard"
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
    >
      {copied ? (
        <>
          <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

export function RedlineSuggestion({ clauseText, clauseType, acv, liabilityCap, className }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [alternative, setAlternative] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function suggest() {
    if (!clauseText.trim()) return;
    setStatus('loading');
    setAlternative('');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contracts/redline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clauseText, clauseType, acv: acv ?? null, liabilityCap: liabilityCap ?? null }),
      });
      const data = (await res.json()) as { alternative?: string; error?: string };
      if (!res.ok || !data.alternative) {
        setErrorMsg(data.error ?? 'No suggestion returned.');
        setStatus('error');
      } else {
        setAlternative(data.alternative);
        setStatus('done');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Request failed.');
      setStatus('error');
    }
  }

  const disabled = !clauseText.trim() || status === 'loading';

  return (
    <div className={`rounded-xl border border-zinc-800 bg-black/30 p-4 ${className ?? ''}`.trim()}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">Suggest redline</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Generate buyer-protective alternative language for this clause.
          </p>
        </div>
        <button
          type="button"
          onClick={suggest}
          disabled={disabled}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === 'loading' ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
              {status === 'done' ? 'Regenerate' : 'Suggest redline'}
            </>
          )}
        </button>
      </div>

      {status === 'done' && alternative && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Proposed language</span>
            <CopyButton text={alternative} />
          </div>
          <div className="whitespace-pre-wrap rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4 text-sm leading-relaxed text-zinc-100">
            {alternative}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-3 rounded-lg border border-red-800/40 bg-red-950/20 p-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
