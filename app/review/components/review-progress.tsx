import Link from 'next/link';

const REVIEW_STEPS = [
  { key: 'lol', label: 'Liability cap', href: '/review/lol' },
  { key: 'indemnities', label: 'Indemnities', href: '/review/indemnities' },
  { key: 'ip', label: 'IP ownership', href: '/review/ip' },
  { key: 'data', label: 'Data protection', href: '/review/data' },
  { key: 'termination', label: 'Termination', href: '/review/termination' },
  { key: 'summary', label: 'Summary', href: '/review/summary' },
] as const;

type StepKey = (typeof REVIEW_STEPS)[number]['key'];

export function ReviewProgress({ current }: { current: StepKey }) {
  const currentIndex = REVIEW_STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Review progress" className="mt-6 overflow-x-auto">
      <ol className="flex min-w-max gap-1.5 pb-1">
        {REVIEW_STEPS.map((step, index) => {
          const isActive = step.key === current;
          const isPast = index < currentIndex;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-zinc-400 bg-zinc-800 text-white'
                    : isPast
                    ? 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                    : 'border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                    isActive
                      ? 'bg-white text-black'
                      : isPast
                      ? 'bg-zinc-600 text-zinc-200'
                      : 'bg-zinc-800 text-zinc-600',
                  ].join(' ')}
                >
                  {isPast ? '✓' : index + 1}
                </span>
                {step.label}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
