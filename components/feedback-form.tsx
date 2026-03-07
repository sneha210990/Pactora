'use client';

import { FormEvent, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

const categories = [
  { value: 'bug', label: 'Bug' },
  { value: 'confusing', label: 'Confusing' },
  { value: 'missing_feature', label: 'Missing feature' },
  { value: 'general_feedback', label: 'General feedback' },
] as const;

type User = {
  email: string;
};

export function FeedbackForm({ user, compact = false }: { user?: User | null; compact?: boolean }) {
  const pathname = usePathname();
  const [category, setCategory] = useState<string>('general_feedback');
  const [rating, setRating] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [email, setEmail] = useState(user?.email ?? '');
  const [requestCall, setRequestCall] = useState<boolean>(false);
  const [canContact, setCanContact] = useState<boolean>(true);
  const [status, setStatus] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const effectiveEmail = useMemo(() => user?.email ?? email, [email, user?.email]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus('');

    const ratingNumber = rating ? Number(rating) : undefined;

    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category,
        rating: ratingNumber,
        message,
        email: effectiveEmail,
        request_call: requestCall,
        can_contact: canContact,
        page_context: pathname || 'unknown',
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setStatus(data?.error ?? 'Unable to submit feedback right now.');
      setSubmitting(false);
      return;
    }

    setMessage('');
    setRating('');
    setRequestCall(false);
    setCanContact(true);
    setStatus('Thanks — your feedback was submitted.');
    setSubmitting(false);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-lg font-medium">Share beta feedback</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Help improve Pactora. Feedback is used for beta support, product improvements, and security monitoring.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <label className="mb-2 block text-sm text-zinc-300">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
          >
            {categories.map((entry) => (
              <option key={entry.value} value={entry.value}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-zinc-300">Rating (optional)</label>
          <select
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} / 5
              </option>
            ))}
          </select>
        </div>

        {!user && (
          <div>
            <label className="mb-2 block text-sm text-zinc-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm text-zinc-300">Message</label>
          <textarea
            required
            minLength={8}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={compact ? 4 : 6}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
            placeholder="What happened, what felt missing, or what would make this better?"
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={requestCall} onChange={(event) => setRequestCall(event.target.checked)} />
          Request a call / demo
        </label>

        <label className="flex items-start gap-2 text-sm text-zinc-300">
          <input type="checkbox" checked={canContact} onChange={(event) => setCanContact(event.target.checked)} />
          Pactora can contact me about this feedback
        </label>

        <p className="text-xs text-zinc-500">
          By submitting feedback, you understand Pactora may use your account details, usage context, and message to operate the beta, improve the product, provide support, and maintain security.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-300"
        >
          {submitting ? 'Sending…' : 'Submit feedback'}
        </button>

        {status ? <p className="text-sm text-zinc-300">{status}</p> : null}
      </form>
    </section>
  );
}
