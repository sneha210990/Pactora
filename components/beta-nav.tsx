import Link from 'next/link';

export function BetaNav() {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-1 text-xs font-medium uppercase tracking-wide text-amber-200">
        Demo mode
      </span>
      <Link href="/deals/new" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
        Start review
      </Link>
    </div>
  );
}
