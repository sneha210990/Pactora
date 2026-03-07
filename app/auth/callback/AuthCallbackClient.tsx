'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type SessionResponse = {
  error?: string;
  stage?: 'session_payload' | 'code_exchange' | 'user_verification';
};

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Completing sign in…');

  useEffect(() => {
    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const expiresIn = Number(hash.get('expires_in') ?? '3600');
      const code = searchParams.get('code');
      const oauthError = searchParams.get('error_description') ?? searchParams.get('error');
      const next = searchParams.get('next') || '/deals/new';

      if (oauthError) {
        setStatus(`Google sign in failed: ${oauthError}`);
        return;
      }

      const payload = code
        ? {
            code,
            redirect_to: `${window.location.origin}${window.location.pathname}${window.location.search}`,
          }
        : {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
          };

      if (!code && (!accessToken || !refreshToken)) {
        setStatus('Sign in could not be completed: missing OAuth code or session tokens.');
        return;
      }

      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorResponse = (await response.json().catch(() => null)) as SessionResponse | null;
        const stageText = errorResponse?.stage ? ` (${errorResponse.stage})` : '';
        setStatus(
          `Sign in could not be completed${stageText}: ${errorResponse?.error ?? 'Unknown error.'}`,
        );
        return;
      }

      setStatus('Sign in complete. Redirecting…');
      router.replace(next);
    };

    run();
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-zinc-400">{status}</p>
      </div>
    </main>
  );
}
