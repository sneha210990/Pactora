'use client';

import { useState } from 'react';
import type { ContractPdfProps } from './contract-pdf';

export function ExportPdfButton(props: ContractPdfProps & { className?: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const { className: classNameOverride, ...pdfProps } = props;

  async function handleExport() {
    setStatus('loading');
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { ContractReviewPdf } = await import('./contract-pdf');
      const blob = await pdf(<ContractReviewPdf {...pdfProps} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (props.contractName || 'contract-review').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      a.download = `${safeName}-pactora.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('idle');
    } catch (err) {
      console.error('PDF export failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={status === 'loading'}
      className={classNameOverride ?? "flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"}
    >
      {status === 'loading' ? (
        <>
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating PDF…
        </>
      ) : status === 'error' ? (
        <>
          <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Export failed
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export PDF
        </>
      )}
    </button>
  );
}
