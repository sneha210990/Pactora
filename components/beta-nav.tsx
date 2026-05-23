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
    <div className="flex items-center gap-3">
      <span className="max-w-[110px] truncate text-xs text-zinc-400 sm:max-w-[160px]">
        {session.user.email}
      </span>
      <form action="/api/auth/logout" method="POST">
        <LogoutSubmitButton />
      </form>
    </div>
  );
}
