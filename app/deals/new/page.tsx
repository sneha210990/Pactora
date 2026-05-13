'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { trackEvent } from '@/components/track-event';
import {
  DocumentAnalysisState,
  useDocumentAnalysis,
  useDocumentAnalysisActions,
} from '@/lib/document-analysis-store';
import type { ClauseFlag } from '@/lib/clause-analysis';
import type { ExtractedContractValues } from '@/lib/contract-extraction';

type ExtractionResponse = {
  documentId?: string;
  detectedValues?: ExtractedContractValues;
  contractText?: string;
  documentMeta?: DocumentAnalysisState['documentMeta'];
  extractedTerms?: DocumentAnalysisState['extractedTerms'];
};

const processingStages: Array<{ key: keyof DocumentAnalysisState['processingSteps']; label: string }> = [
  { key: 'upload', label: 'Capturing contract input…' },
  { key: 'extraction', label: 'Extracting supported values…' },
  { key: 'clauseDetection', label: 'Identifying clauses…' },
  { key: 'riskAnalysis', label: 'Analyzing risks…' },
  { key: 'recommendations', label: 'Generating recommendations…' },
];

function formatOptionalMoney(value?: number) {
  if (!value) return '';
  return String(value);
}

function ProcessingPipeline({ analysis }: { analysis: DocumentAnalysisState }) {
  if (analysis.uploadStatus === 'idle') return null;

  return (
    <div className="mt-5 rounded-xl border border-zinc-800 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Processing pipeline</p>
        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
          {analysis.uploadStatus === 'complete' ? 'Finalizing workspace… complete' : analysis.uploadStatus}
        </span>
      </div>
      <ol className="space-y-2 text-sm">
        {processingStages.map((stage) => (
          <li key={stage.key} className="flex items-center gap-3 text-zinc-300">
            <span className={`h-2.5 w-2.5 rounded-full ${analysis.processingSteps[stage.key] ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
            <span>{stage.label}</span>
          </li>
        ))}
        <li className="flex items-center gap-3 text-zinc-300">
          <span className={`h-2.5 w-2.5 rounded-full ${analysis.uploadStatus === 'complete' ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
          <span>Finalizing workspace…</span>
        </li>
      </ol>
    </div>
  );
}

export default function NewDealPage() {
  const analysis = useDocumentAnalysis();
  const actions = useDocumentAnalysisActions();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [manualClauseText, setManualClauseText] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    // Restore pasted text if the page reloaded mid-analysis.
    // If the store already has a completed analysis, the text was already processed.
    return sessionStorage.getItem('pactora.manualClauseText') ?? '';
  });

  useEffect(() => {
    sessionStorage.setItem('pactora.manualClauseText', manualClauseText);
  }, [manualClauseText]);
  const [hasAcceptedLegalNotice, setHasAcceptedLegalNotice] = useState<boolean>(false);
  const [hasConfirmedDataCaution, setHasConfirmedDataCaution] = useState<boolean>(false);

  const commercialContext = analysis.commercialContext ?? {};
  const selectedFileName = analysis.documentMeta.fileName ?? '';
  const canContinue = analysis.uploadStatus === 'complete' && hasAcceptedLegalNotice && hasConfirmedDataCaution;
  const runClauseAnalysis = async (text: string) => {
    actions.analysisStarted();
    try {
      const res = await fetch('/api/contracts/analyze-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Clause analysis failed.');
      }

      if (!res.body) throw new Error('No response stream from analysis.');

      // Read the SSE stream — each agent emits an event as it finishes.
      // We wait for 'analysis_complete' which carries the full flags array.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let received = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          const json = part.slice(6).trim();
          if (!json) continue;
          try {
            const event = JSON.parse(json) as {
              type: string;
              flags?: ClauseFlag[];
              analyzedAt?: string;
            };
            if (event.type === 'analysis_complete' && Array.isArray(event.flags)) {
              actions.hydrateAnalysis({
                flags: event.flags,
                analyzedAt: event.analyzedAt ?? new Date().toISOString(),
              });
              sessionStorage.removeItem('pactora.manualClauseText');
              received = true;
            }
          } catch {
            // ignore malformed SSE events
          }
        }
      }

      if (!received) throw new Error('Analysis completed without returning results.');
    } catch (error) {
      actions.analysisFailed(error instanceof Error ? error.message : 'Clause analysis failed.');
    }
  };

  const processExtractionPayload = (payload: ExtractionResponse, successEventName: string) => {
    console.info('[PACTORA] Parser payload shape', { endpoint: '/api/contracts/extract', keys: Object.keys(payload) });
    actions.hydrateExtraction(payload);
    trackEvent(successEventName, '/deals/new');

    if (payload.contractText) {
      void runClauseAnalysis(payload.contractText);
    } else {
      actions.analysisFailed('Analysis incomplete: no raw text returned by parser.');
    }
  };

  const handleContractUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      actions.reset();
      setUploadError(null);
      return;
    }

    setUploadError(null);
    actions.uploadStarted(file);
    trackEvent('contract_upload_started', '/deals/new');

    try {
      const formData = new FormData();
      formData.append('contract', file);

      const response = await fetch('/api/contracts/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Could not extract contract values.');
      }

      const payload = (await response.json()) as ExtractionResponse;
      processExtractionPayload(payload, 'contract_uploaded');
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't read this file.";
      setUploadError(message);
      actions.setError(message);
    }
  };

  const handleManualClauseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = manualClauseText.trim();

    if (text.length < 20) {
      const message = 'Please paste at least 20 characters of contract clauses.';
      setUploadError(message);
      actions.setError(message);
      return;
    }

    setUploadError(null);
    actions.uploadStarted({ name: 'Pasted contract clauses', type: 'text/plain' });
    trackEvent('manual_clause_entry_started', '/deals/new');

    try {
      const response = await fetch('/api/contracts/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceName: 'Pasted contract clauses' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Could not read pasted clauses.');
      }

      const payload = (await response.json()) as ExtractionResponse;
      processExtractionPayload(payload, 'manual_clause_entry_submitted');
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't read these clauses.";
      setUploadError(message);
      actions.setError(message);
    }
  };

  const warnings = useMemo(() => {
    const items = [...(analysis.errors ?? [])];
    const missingExtractionFields = analysis.diagnostics?.missingFields ?? [];
    if (analysis.uploadStatus === 'complete' && missingExtractionFields.length > 0) {
      items.push(`Analysis incomplete: ${missingExtractionFields.join(', ')} not identified.`);
    }
    return items;
  }, [analysis.diagnostics?.missingFields, analysis.errors, analysis.uploadStatus]);

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">New Deal Intake</h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            Upload your draft contract or paste key clauses manually, confirm the extracted commercial context, then continue to Liability review.
          </p>
        </header>

        <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Step 1 of 3</p>
          <h2 className="mt-1 text-lg font-medium text-white">Add contract content</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Upload your contract (PDF, DOCX, or legacy DOC) or paste the clauses you want Pactora to review. Pactora will only display extracted data it can support.
          </p>

          <div className="mt-5">
            <label htmlFor="contractUpload" className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Contract file (.pdf, .docx, or .doc)
            </label>
            <input
              id="contractUpload"
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={handleContractUpload}
              className="block w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-zinc-200"
            />
            {selectedFileName ? (
              <p className="mt-3 text-sm text-zinc-300">
                Current input: <span className="font-medium text-white">{selectedFileName}</span>
              </p>
            ) : null}

            <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-500">
              <span className="h-px flex-1 bg-zinc-800" />
              <span>or paste clauses manually</span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>

            <form onSubmit={handleManualClauseSubmit} className="space-y-3">
              <label htmlFor="manualClauses" className="block text-xs font-medium uppercase tracking-wide text-zinc-400">
                Contract clauses
              </label>
              <textarea
                id="manualClauses"
                value={manualClauseText}
                onChange={(event) => setManualClauseText(event.target.value)}
                rows={8}
                placeholder="Paste limitation of liability, indemnity, termination, data protection, or other contract clauses here…"
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">Manual mode accepts pasted text when a file is unavailable or you only need to review selected clauses.</p>
                <button
                  type="submit"
                  disabled={analysis.uploadStatus === 'uploading' || analysis.uploadStatus === 'processing'}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  Analyze pasted clauses
                </button>
              </div>
            </form>

            {uploadError ? (
              <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm font-medium text-red-300">{uploadError}</p>
                <p className="mt-1 text-xs text-red-400">Please select a text-based PDF, DOCX, or DOC under 20 MB, or paste at least 20 characters of clause text.</p>
              </div>
            ) : null}
            <ProcessingPipeline analysis={analysis} />
          </div>
        </section>

        {warnings.length > 0 ? (
          <section className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            <h2 className="font-semibold">Partial analysis warning</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </section>
        ) : null}

        <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Step 2 of 3</p>
          <h2 className="mt-1 text-lg font-medium text-white">Extracted commercial context</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Empty fields mean the parser did not identify that value. Pactora will not substitute fake defaults.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="Annual contract value" value={formatOptionalMoney(commercialContext.acv)} empty="ACV not detected" />
            <ReadOnlyField label="Initial term" value={commercialContext.termMonths ? `${commercialContext.termMonths} months` : ''} empty="Initial term not detected" />
            <ReadOnlyField label="Insurance cover" value={formatOptionalMoney(commercialContext.insuranceCover)} empty="Insurance cover not detected" />
            <ReadOnlyField label="Data type" value={commercialContext.dataType} empty="Data category not identified" />
            <ReadOnlyField label="Governing law" value={analysis.extractedTerms.governingLaw} empty="No governing law identified" />
            <ReadOnlyField label="Termination notice" value={analysis.extractedTerms.terminationNotice} empty="Clause not detected" />
          </div>
        </section>

        <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Step 3 of 3</p>
          <h2 className="mt-1 text-lg font-medium text-white">Acknowledgment</h2>

          <div className="mt-4 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-200">Legal notice</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-200">
              <li>Pactora provides decision-support software for commercial contract review.</li>
              <li>Pactora does not provide legal advice or create a lawyer-client relationship.</li>
              <li>Outputs may be incomplete or inaccurate and should be validated.</li>
              <li>Use qualified human and legal review where appropriate before material decisions.</li>
              <li>You must be authorised to upload or paste the document and its contents.</li>
            </ul>
            <p className="mt-4 text-zinc-300">
              Read our <Link href="/terms" className="text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-100">Terms</Link>,{' '}
              <Link href="/privacy" className="text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-100">Privacy Notice</Link>,{' '}
              <Link href="/security" className="text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-100">Security</Link> and{' '}
              <Link href="/subprocessors" className="text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-100">Subprocessors</Link>.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-200">
              <input type="checkbox" required checked={hasAcceptedLegalNotice} onChange={(event) => setHasAcceptedLegalNotice(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-white" />
              <span>I confirm that I am authorised to upload or paste this material and understand Pactora outputs may be incomplete or inaccurate.</span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-200">
              <input type="checkbox" required checked={hasConfirmedDataCaution} onChange={(event) => setHasConfirmedDataCaution(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-white" />
              <span>I understand extracted values are parser outputs and should be checked before legal or commercial decisions.</span>
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          {canContinue ? (
            <Link href="/review/lol" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
              Continue to Liability review
            </Link>
          ) : (
            <button disabled className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-500">
              Complete input and acknowledgments
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function ReadOnlyField({ label, value, empty }: { label: string; value?: string; empty: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-2 text-sm font-semibold ${value ? 'text-zinc-100' : 'text-zinc-500'}`}>{value || empty}</div>
    </div>
  );
}
