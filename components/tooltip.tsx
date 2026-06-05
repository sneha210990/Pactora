'use client';

import { useId, useState } from 'react';

type TooltipProps = {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  width?: string;
};

export function Tooltip({ content, children, position = 'top', width = 'w-60' }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`pointer-events-none absolute z-30 ${width} max-w-[calc(100vw-2rem)] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs leading-relaxed text-zinc-300 shadow-xl ${
            position === 'top'
              ? 'bottom-full left-1/2 mb-1.5 -translate-x-1/2'
              : 'top-full left-1/2 mt-1.5 -translate-x-1/2'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
