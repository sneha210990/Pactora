'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/api-fetch';

type Message = { role: 'user' | 'assistant'; content: string };

type Props = {
  contractText: string;
  messages: Message[];
  onMessagesChange: (updater: (prev: Message[]) => Message[]) => void;
};

const SUGGESTIONS: Record<string, string[]> = {
  '/review/summary': [
    'Which clause poses the highest risk to us?',
    'Give me a one-paragraph deal summary.',
    'What should I negotiate first?',
  ],
  '/review/lol': [
    'Is this liability cap reasonable for our deal size?',
    'What carve-outs are missing from this cap?',
    'How does this compare to market standard?',
  ],
  '/review/indemnities': [
    'How one-sided is this indemnity clause?',
    'What is the uncapped exposure here?',
    'Draft a mutual indemnity counter-proposal.',
  ],
  '/review/ip': [
    'Does this transfer our pre-existing IP?',
    'How broad is the licence grant?',
    'What IP protections should we push for?',
  ],
  '/review/data': [
    'Is there a GDPR processor agreement?',
    'What are the data breach notification obligations?',
    'Are the sub-processor controls adequate?',
  ],
  '/review/termination': [
    'Can they terminate for convenience?',
    'What is the effective notice period?',
    'Are there adequate cure-period protections?',
  ],
};

const DEFAULT_SUGGESTIONS = [
  'What does the liability cap mean in practice?',
  'Which clause poses the highest risk to us?',
  'Draft a counter-proposal for the indemnity clause.',
];

// --- Inline markdown renderer ---

type InlinePart = { type: 'bold' | 'italic' | 'code' | 'text'; content: string };

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: 'text', content: text.slice(last, match.index) });
    const raw = match[0];
    if (raw.startsWith('**')) parts.push({ type: 'bold', content: raw.slice(2, -2) });
    else if (raw.startsWith('*')) parts.push({ type: 'italic', content: raw.slice(1, -1) });
    else parts.push({ type: 'code', content: raw.slice(1, -1) });
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
  return parts;
}

function InlineContent({ text }: { text: string }) {
  const parts = parseInline(text);
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'bold') return <strong key={i} className="font-semibold text-zinc-100">{p.content}</strong>;
        if (p.type === 'italic') return <em key={i} className="italic">{p.content}</em>;
        if (p.type === 'code') return <code key={i} className="rounded bg-zinc-800 px-1 font-mono text-[11px] text-zinc-300">{p.content}</code>;
        return <span key={i}>{p.content}</span>;
      })}
    </>
  );
}

function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      nodes.push(<p key={i} className="mt-3 mb-0.5 text-[13px] font-semibold text-zinc-100"><InlineContent text={line.slice(4)} /></p>);
    } else if (line.startsWith('## ')) {
      nodes.push(<p key={i} className="mt-3 mb-1 font-semibold text-zinc-100"><InlineContent text={line.slice(3)} /></p>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('• '))) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1 space-y-0.5 pl-4">
          {items.map((item, j) => (
            <li key={j} className="list-disc text-zinc-300">
              <InlineContent text={item} />
            </li>
          ))}
        </ul>,
      );
      continue;
    } else if (line.trim() === '') {
      // intentional gap
    } else {
      nodes.push(
        <p key={i} className="leading-relaxed text-zinc-200">
          <InlineContent text={line} />
        </p>,
      );
    }
    i++;
  }

  return <div className="space-y-1 text-sm">{nodes}</div>;
}

// --- Icons ---

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

function BotIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  );
}

// --- Main component ---

export function ChatSidebar({ contractText, messages, onMessagesChange }: Props) {
  const pathname = usePathname();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = SUGGESTIONS[pathname] ?? DEFAULT_SUGGESTIONS;
  const hasContract = !!contractText;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(
    async (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || loading || !hasContract) return;

      setInput('');
      setError('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      const userMsg: Message = { role: 'user', content };
      let historySnapshot: Message[] = [];
      onMessagesChange((prev) => {
        historySnapshot = [...prev, userMsg];
        return historySnapshot;
      });

      onMessagesChange((prev) => [...prev, { role: 'assistant', content: '' }]);
      setLoading(true);

      try {
        const res = await apiFetch('/api/contracts/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: historySnapshot, contractText }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({ error: 'Request failed.' }));
          throw new Error((data as { error?: string }).error ?? 'Request failed.');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          onMessagesChange((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: accumulated };
            return updated;
          });
        }
      } catch (err) {
        onMessagesChange((prev) => prev.slice(0, -1));
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
        textareaRef.current?.focus();
      }
    },
    [input, loading, hasContract, contractText, onMessagesChange],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-zinc-800/70 px-5 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">
          <BotIcon />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">AI Assistant</p>
          <p className="text-[11px] text-zinc-500">
            {hasContract ? 'Ask anything about this contract' : 'Upload a contract to start'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && hasContract && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-zinc-600">Suggested questions</p>
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left text-[13px] text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.length === 0 && !hasContract && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
              <BotIcon />
            </div>
            <p className="text-sm text-zinc-500">
              Upload a contract to enable<br />the AI assistant.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">
                <BotIcon />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'rounded-tr-sm bg-zinc-800 text-sm text-zinc-100'
                  : 'rounded-tl-sm border border-zinc-800/60 bg-zinc-900/60'
              }`}
            >
              {msg.role === 'assistant' ? (
                msg.content ? (
                  <MarkdownBlock content={msg.content} />
                ) : (
                  <span className="animate-pulse text-violet-400">▋</span>
                )
              ) : (
                <p className="text-sm leading-relaxed">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800/70 px-4 py-4">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={hasContract ? 'Ask anything… (Shift+Enter for newline)' : 'Upload a contract first'}
            disabled={loading || !hasContract}
            className="flex-1 resize-none rounded-xl border border-zinc-700 bg-black/40 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-40"
            style={{ minHeight: '42px' }}
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim() || !hasContract}
            aria-label="Send message"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-zinc-600 bg-zinc-800 text-zinc-300 transition hover:border-zinc-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? <SpinnerIcon /> : <SendIcon />}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-zinc-700">AI can make mistakes. Verify important information.</p>
      </div>
    </div>
  );
}
