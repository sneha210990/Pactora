'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  google_auth_failed: 'Google sign-in could not be completed.',
  invalid_credentials: 'Invalid email or password.',
  signup_failed: 'Account creation could not be completed.',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [status, setStatus] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (!errorCode) {
      return '';
    }

    return ERROR_MESSAGES[errorCode] ?? errorCode;
  });
  const [loading, setLoading] = useState(false);
  const [nextPath] = useState(() => {
    if (typeof window === 'undefined') {
      return '/deals/new';
    }

    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    return next?.startsWith('/') ? next : '/deals/new';
  });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('');
    setLoading(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, mode }),
    });

    if (!response.ok) {
      const fallback = await response.text().catch(() => '');
      const data = (() => {
        if (!fallback) {
          return null;
        }

        try {
          return JSON.parse(fallback) as {
            error?: string;
            message?: string;
            error_description?: string;
          };
        } catch {
          return null;
        }
      })();

      setStatus(data?.error ?? data?.message ?? data?.error_description ?? (fallback || 'Unable to continue right now.'));
      setLoading(false);
      return;
    }

    window.location.href = nextPath;
  };

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-amber-300">Pactora</p>
          <h1 className="text-3xl font-semibold tracking-tight">{mode === 'login' ? 'Log in' : 'Sign up'}</h1>
          <p className="text-sm text-zinc-400">Use your account to continue to your deal workspace.</p>
        </header>

        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <a
            href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`}
            className="block rounded-lg border border-zinc-700 px-4 py-2 text-center text-sm font-medium hover:bg-zinc-900"
          >
            Continue with Google
          </a>

          <div className="relative py-1 text-center text-xs uppercase tracking-wide text-zinc-500">
            <span className="bg-zinc-950 px-2">or continue with email</span>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-white px-4 py-2 font-semibold text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-300"
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Continue with email' : 'Sign up with email'}
            </button>

            {status ? <p className="text-sm text-amber-200">{status}</p> : null}
          </form>

          <p className="text-sm text-zinc-400">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-zinc-100 underline"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </p>

          <p className="text-xs text-zinc-500">
            By continuing, you understand that Pactora will use your account details, usage data, and any feedback you submit to operate the service, improve the product, provide support, and maintain security. See the{' '}
            <Link href="/privacy" className="underline">Privacy Notice</Link>
            {' '}for more information.
          </p>
        </div>
      </div>
    </main>
  );
}
