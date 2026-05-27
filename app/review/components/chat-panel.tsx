'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';

type Message = { role: 'user' | 'assistant'; content: string };

type Props = {
  contractText: string;
};

const SUGGESTED_QUESTIONS = [
  'What does the liability cap mean in practice?',
  'Which clause poses the highest risk to us?',
  'Draft a counter-proposal for the indemnity clause.',
];

function SendIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function ChatPanel({ contractText }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading || !contractText) return;

    setInput('');
    setError('');
    const userMsg: Message = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);

    // Optimistically add an empty assistant bubble that we'll fill as tokens arrive
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await apiFetch('/api/contracts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, contractText }),
      });

      if (!res.ok || !res.body) {
        throw new Error((await res.json().catch(() => ({ error: 'Request failed.' }))).error ?? 'Request failed.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: accumulated };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1)); // remove empty assistant bubble
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const hasContract = !!contractText;

  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/50">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Ask about this contract</h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Ask follow-up questions about any clause, risk, or negotiation position. Responses are contract-specific.
        </p>
      </div>

      {messages.length > 0 && (
        <div className="max-h-[480px] overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'border border-zinc-800 bg-black/40 text-zinc-200'
                }`}
              >
                {msg.content || (
                  <span className="text-zinc-500 animate-pulse">▋</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {messages.length === 0 && hasContract && (
        <div className="px-5 py-4 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full border border-zinc-700 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className={`${messages.length > 0 ? 'border-t border-zinc-800' : ''} px-5 py-4`}>
        {error && (
          <p className="mb-2 text-xs text-red-400">{error}</p>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={hasContract ? 'Ask anything about this contract…' : 'Upload a contract to enable chat'}
            disabled={loading || !hasContract}
            className="flex-1 rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={loading || !input.trim() || !hasContract}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <SpinnerIcon /> : <SendIcon />}
            {loading ? 'Thinking…' : 'Send'}
          </button>
        </div>
      </div>
    </section>
  );
}
