'use client';

import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';

export function LogoutSubmitButton() {
  const router = useRouter();

  async function handleLogout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
    >
      Log out
    </button>
  );
}
