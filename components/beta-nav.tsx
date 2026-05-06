import Link from 'next/link';

export function BetaNav() {
  return (
    <Link
      href="/login"
      className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-100 transition hover:bg-zinc-900"
    >
      Log In
    </Link>
  );
}
