'use client';

import { useState } from 'react';
import { useDocumentAnalysis } from '@/lib/document-analysis-store';
import { ChatSidebar } from './components/chat-sidebar';

type Message = { role: 'user' | 'assistant'; content: string };

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const analysis = useDocumentAnalysis();
  const contractText = analysis?.rawText ?? '';

  return (
    <div className="flex">
      <div className="min-w-0 flex-1">{children}</div>
      <aside className="sticky top-0 hidden h-screen w-[380px] shrink-0 flex-col border-l border-zinc-800/70 bg-zinc-950 lg:flex">
        <ChatSidebar
          contractText={contractText}
          messages={messages}
          onMessagesChange={setMessages}
        />
      </aside>
    </div>
  );
}
