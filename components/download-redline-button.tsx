'use client';

import { useState } from 'react';

type AcceptedRedline = { clauseText: string; proposedText: string; explanation: string };

type Props = {
  acceptedRedlines: Record<string, AcceptedRedline>;
  sourceFileType: 'docx' | 'pdf' | null;
  fileName: string;
};

export function DownloadRedlineButton({ acceptedRedlines, sourceFileType, fileName }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const docxBuffer = sourceFileType === 'docx'
        ? (typeof window !== 'undefined' ? sessionStorage.getItem('pactora.docxBuffer') ?? undefined : undefined)
        : undefined;

      const res = await fetch('/api/contracts/redline/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedRedlines,
          docxBuffer,
          sourceFileType: sourceFileType ?? 'pdf',
          fileName,
        }),
      });

      if (!res.ok) {
        console.error('Redline export failed:', await res.text());
        return;
      }

      const blob = await res.blob();
      const isDocx = sourceFileType === 'docx' && !!docxBuffer;
      const ext = isDocx ? 'docx' : 'pdf';
      const baseName = fileName.replace(/\.[^.]+$/, '');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}-redlined.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  const count = Object.keys(acceptedRedlines).length;
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-950/40 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:border-emerald-500 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Preparing…
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download redline{' '}
          <span className="rounded-full bg-emerald-800/60 px-1.5 text-[11px]">{count}</span>
        </>
      )}
    </button>
  );
}
