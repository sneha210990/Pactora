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
type RiskLevel = 'Low' | 'Medium' | 'High';

export function ReviewProgress({
  current,
  sectionRisks,
}: {
  current: StepKey;
  sectionRisks?: Partial<Record<string, RiskLevel>>;
}) {
  const currentIndex = REVIEW_STEPS.findIndex((s) => s.key === current);
  return (
    <nav aria-label="Review progress" className="mt-6 overflow-x-auto">
      <ol className="flex min-w-max gap-1.5 pb-1">
        {REVIEW_STEPS.map((step, index) => {
          const isActive = step.key === current;
          const isPast = index < currentIndex;
          const stepRisk = isPast ? sectionRisks?.[step.key] : undefined;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                aria-current={isActive ? 'step' : undefined}
                className={[
                  'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-zinc-400 bg-zinc-800 text-white'
                    : isPast && stepRisk === 'High'
                    ? 'border-red-500/60 bg-red-500/5 text-red-300 hover:border-red-400 hover:text-red-200'
                    : isPast && stepRisk === 'Medium'
                    ? 'border-amber-500/50 bg-amber-500/5 text-amber-300 hover:border-amber-400 hover:text-amber-200'
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
                      : isPast && stepRisk === 'High'
                      ? 'bg-red-500/20 text-red-300'
                      : isPast && stepRisk === 'Medium'
                      ? 'bg-amber-500/20 text-amber-300'
                      : isPast
                      ? 'bg-zinc-600 text-zinc-200'
                      : 'bg-zinc-800 text-zinc-600',
                  ].join(' ')}
                >
                  {isPast ? '✓' : index + 1}
                </span>
                {step.label}
                {stepRisk && (
                  <span
                    aria-label={`${stepRisk} risk`}
                    className={[
                      'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold leading-none',
                      stepRisk === 'High'
                        ? 'bg-red-500/20 text-red-300'
                        : stepRisk === 'Medium'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300',
                    ].join(' ')}
                  >
                    {stepRisk === 'High' ? 'H' : stepRisk === 'Medium' ? 'M' : 'L'}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
