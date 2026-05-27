'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';

type AcceptedRedline = { clauseText: string; proposedText: string; explanation: string };

type Props = {
  acceptedRedlines: Record<string, AcceptedRedline>;
  sourceFileType: 'docx' | 'pdf' | null;
  fileName: string;
};

async function downloadMarkupSchedule(
  acceptedRedlines: Record<string, AcceptedRedline>,
  fileName: string,
) {
  const { pdf } = await import('@react-pdf/renderer');
  const { MarkupSchedulePdf } = await import('./markup-schedule-pdf');
  const items = Object.entries(acceptedRedlines).map(([clauseType, r]) => ({
    clauseType,
    ...r,
  }));
  const element = MarkupSchedulePdf({
    items,
    fileName,
    generatedAt: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  });
  const blob = await pdf(element).toBlob();
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}-markup-schedule.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadDocxRedline(
  acceptedRedlines: Record<string, AcceptedRedline>,
  fileName: string,
) {
  const docxBuffer = sessionStorage.getItem('pactora.docxBuffer') ?? undefined;

  const res = await apiFetch('/api/contracts/redline/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acceptedRedlines, docxBuffer, fileName }),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const blob = await res.blob();
  const baseName = fileName.replace(/\.[^.]+$/, '');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // If server fell back to markup schedule (no docxBuffer), extension will be .pdf
  const ext = blob.type.includes('pdf') ? 'pdf' : 'docx';
  a.download = `${baseName}-redlined.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DownloadRedlineButton({ acceptedRedlines, sourceFileType, fileName }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    setLoading(true);
    setError('');
    try {
      const hasDocxBuffer = !!sessionStorage.getItem('pactora.docxBuffer');
      if (sourceFileType === 'docx' && hasDocxBuffer) {
        try {
          await downloadDocxRedline(acceptedRedlines, fileName);
        } catch (docxErr) {
          console.error('[redline] DOCX export failed, falling back to markup schedule:', docxErr);
          setError('DOCX export unavailable. Downloading as PDF instead. Your redlines are preserved.');
          await downloadMarkupSchedule(acceptedRedlines, fileName);
        }
      } else {
        await downloadMarkupSchedule(acceptedRedlines, fileName);
      }
    } catch (err) {
      console.error('Redline download failed:', err);
      setError('Download failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const count = Object.keys(acceptedRedlines).length;
  if (count === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
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
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
