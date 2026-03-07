export const dynamic = 'force-dynamic';
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Completing sign in…');

  useEffect(() => {
    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');
      const expires_in = Number(hash.get('expires_in') ?? '3600');
      const next = searchParams.get('next') || '/deals/new';

      if (!access_token || !refresh_token) {
        setStatus('Sign in could not be completed. Please try again.');
        return;
      }

      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token, refresh_token, expires_in }),
      });

      if (!response.ok) {
        setStatus('Sign in could not be completed. Please try again.');
        return;
      }

      router.replace(next);
    };

    run();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-800 bg-zinc-950 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-3 text-sm text-zinc-400">{status}</p>
      </div>
    </main>
  );
}
