'use client';

import { useEffect, useRef, useState } from 'react';

const LABEL_DESCRIPTIONS: Record<string, string> = {
  Ask: 'Your opening position. State this first — if the counterparty accepts, you win the point outright without giving anything away.',
  Fallback:
    'Your secondary position. Move here if your Ask is rejected. It signals flexibility without revealing the floor you would accept.',
  Narrowing:
    'A carve-out rather than a number move. Instead of changing the headline figure, you restrict what the clause actually covers.',
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
        {label}
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
              className="absolute left-0 top-full z-20 mt-1.5 w-60 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-xs text-zinc-300 shadow-xl"
            >
              <p className="font-semibold text-zinc-100">{label}</p>
              <p className="mt-1 leading-relaxed">{description}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function NegotiationLadder({ title = 'Negotiation ladder', items, className }: NegotiationLadderProps) {
  return (
    <div className={`rounded-xl border border-zinc-800 bg-black/30 p-4 ${className ?? ''}`.trim()}>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
        {items.map((item) => (
          <div key={`${item.label}-${item.title}`} className="rounded-lg border border-zinc-800 bg-black/30 p-4">
            <LabelBadge label={item.label} />
            <div className="mt-2 font-medium">{item.title}</div>
            <div className="mt-2 text-sm text-zinc-300">{item.script}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
