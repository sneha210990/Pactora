'use client';

import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [useCase, setUseCase] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('');
    setLoading(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        full_name: fullName,
        company,
        role,
        use_case: useCase,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(data?.error ?? 'Unable to log in right now.');
      setLoading(false);
      return;
    }

    window.location.href = '/deals/new';
  };

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-amber-300">Pactora Beta Access</p>
          <h1 className="text-3xl font-semibold tracking-tight">Lightweight beta login</h1>
          <p className="text-sm text-zinc-400">
            Use your work email to continue. Optional profile details help us understand who Pactora is useful for.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <div>
            <label className="mb-2 block text-sm text-zinc-300">Email (required)</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">Full name (optional)</label>
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-300">Company (optional)</label>
              <input
                type="text"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-300">Role (optional)</label>
              <input
                type="text"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-300">Use case (optional)</label>
            <textarea
              value={useCase}
              onChange={(event) => setUseCase(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
              placeholder="What contracts or decisions are you reviewing with Pactora?"
            />
          </div>

          <p className="text-xs text-zinc-500">
            By continuing, you understand that Pactora will use your account details, usage data, and any feedback you submit to operate the beta, improve the product, provide support, and maintain security. See the Privacy Notice for more information.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-white px-4 py-2 font-semibold text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-300"
          >
            {loading ? 'Signing in…' : 'Continue'}
          </button>
          {status ? <p className="text-sm text-amber-200">{status}</p> : null}
        </form>
      </div>
    </main>
  );
}
