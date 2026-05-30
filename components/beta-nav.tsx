import Link from 'next/link';
import { getCurrentSessionUser } from '@/lib/auth';
import { LogoutSubmitButton } from './logout-submit-button';

export async function BetaNav() {
  const session = await getCurrentSessionUser();

  if (!session?.user?.email) {
    return (
      <Link
        href="/login"
        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-100 transition hover:bg-zinc-900"
      >
        Log In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        title={session.user.email}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-xs font-semibold text-zinc-200"
      >
        {session.user.email.charAt(0).toUpperCase()}
      </span>
      <span className="h-4 w-px bg-zinc-700" aria-hidden="true" />
      <form action="/api/auth/logout" method="POST">
        <LogoutSubmitButton />
      </form>
    </div>
  );
}
