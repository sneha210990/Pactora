'use client';

import { useEffect, useRef, useState } from 'react';

const LABEL_DISPLAY: Record<string, string> = {
  Ask: 'Best case',
  Fallback: 'Acceptable',
  Narrowing: 'Last resort',
  'Position 1': 'Best case',
  'Position 2': 'Acceptable',
  'Position 3': 'Last resort',
  'Position 4': 'Walk-away point',
};

const LABEL_DESCRIPTIONS: Record<string, string> = {
  Ask: 'Your opening position. State this first — if the counterparty accepts, you win the point outright without giving anything away.',
  Fallback:
    'Your secondary position. Move here if your opening is rejected. It signals flexibility without revealing the floor you would accept.',
  Narrowing:
    'A scope move rather than a number move. Instead of changing the headline figure, you restrict what the clause actually covers.',
  'Position 1': 'Your strongest opening position. State this first.',
  'Position 2': 'A moderate fallback if Position 1 is rejected.',
  'Position 3': 'A further fallback — still acceptable but less favourable.',
  'Position 4': 'Your final position. Below this, consider escalating or walking away.',
};

type NegotiationLadderItem = {
  label: string;
  title: string;
  script: string;
};

type NegotiationLadderProps = {
  title?: string;
  items: NegotiationLadderItem[];
  className?: string;
};

function LabelBadge({ label }: { label: string }) {
  const description = LABEL_DESCRIPTIONS[label];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <span className="inline-block rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
        {LABEL_DISPLAY[label] ?? label}
      </span>
      {description && (
        <>
          <button
            type="button"
            aria-label={`What does ${label} mean?`}
            onClick={() => setOpen((v) => !v)}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[10px] font-semibold text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            ?
          </button>
          {open && (
            <div
              role="tooltip"
              className="absolute left-1/2 top-full z-20 mt-1.5 w-60 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-300 shadow-xl"
            >
              <p className="font-semibold text-zinc-100">{LABEL_DISPLAY[label] ?? label}</p>
              <p className="mt-1 leading-relaxed">{description}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — fail silently
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied to clipboard' : 'Copy script to clipboard'}
      className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
    >
      <span aria-live="polite" className="sr-only">{copied ? 'Copied to clipboard' : ''}</span>
      {copied ? (
        <>
          <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span aria-hidden="true" className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <svg className="h-3 w-3" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
          </svg>
          <span aria-hidden="true">Copy</span>
        </>
      )}
    </button>
  );
}

export function NegotiationLadder({ title = 'Negotiation ladder', items, className }: NegotiationLadderProps) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-black/30 p-4 ${className ?? ''}`.trim()}>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        {items.map((item) => (
          <div key={`${item.label}-${item.title}`} className="rounded-lg border border-zinc-800 bg-black/30 p-4">
            <div className="flex items-start justify-between gap-2">
              <LabelBadge label={item.label} />
              <CopyButton text={item.script} />
            </div>
            <div className="mt-2 font-medium">{item.title}</div>
            <div className="mt-2 text-sm text-zinc-300">{item.script}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
