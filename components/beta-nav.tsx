import Link from 'next/link';

export function BetaNav() {
  return (
    <div className="flex items-center gap-2">
      <Link href="/deals/new" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
        Start review
      </Link>
    </div>
  );
}
