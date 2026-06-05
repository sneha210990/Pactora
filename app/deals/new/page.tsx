'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '@/components/track-event';
import { apiFetch } from '@/lib/api-fetch';
import {
  clearPersistedState,
  DocumentAnalysisState,
  useDocumentAnalysis,
  useDocumentAnalysisActions,
  JURISDICTION_LABELS,
  type Jurisdiction,
} from '@/lib/document-analysis-store';
import type { ClauseFlag } from '@/lib/clause-analysis';
import { saveDeal } from '@/lib/deals-history';
import { formatMoney } from '@/app/review/components/active-document-banner';
import type { ExtractedContractValues } from '@/lib/contract-extraction';
import { PACTORA_CLAUSE_AGENTS, type AgentEvent, type PactoraClauseType } from '@/lib/agents/types';

type AgentStatus = 'active' | 'done' | 'error';
type AgentProgressMap = Partial<Record<PactoraClauseType, AgentStatus>>;

type ExtractionResponse = {
  documentId?: string;
  detectedValues?: ExtractedContractValues;
  contractText?: string;
  documentMeta?: DocumentAnalysisState['documentMeta'];
  extractedTerms?: DocumentAnalysisState['extractedTerms'];
  sourceFileType?: 'docx' | 'pdf';
  docxBuffer?: string;
};

const processingStages: Array<{ key: keyof DocumentAnalysisState['processingSteps']; label: string }> = [
  { key: 'upload', label: 'Reading your contract…' },
  { key: 'extraction', label: 'Identifying key terms…' },
  { key: 'clauseDetection', label: 'Detecting clauses…' },
  { key: 'riskAnalysis', label: 'Analysing risks…' },
  { key: 'recommendations', label: 'Preparing recommendations…' },
];

function formatOptionalMoneyValue(value: number | null) {
  return value === null ? '' : formatMoney(value);
}

function ProcessingPipeline({ analysis, agentProgress }: { analysis: DocumentAnalysisState; agentProgress?: AgentProgressMap }) {
  if (analysis.uploadStatus === 'idle') return null;
  const showAgents = agentProgress && Object.keys(agentProgress).length > 0;

  return (
    <div className="mt-5 rounded-xl border border-zinc-800 bg-black/30 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Processing pipeline</p>
        <span aria-live="polite" className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300">
          {analysis.uploadStatus === 'complete' ? 'Analysis complete' : analysis.uploadStatus}
        </span>
      </div>
      <ol className="space-y-2 text-sm">
        {processingStages.map((stage) => (
          <li key={stage.key} className="flex flex-col">
            <div className="flex items-center gap-3 text-zinc-300">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${analysis.processingSteps[stage.key] ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
              <span>{stage.label}</span>
            </div>
            {stage.key === 'clauseDetection' && showAgents && (
              <ol className="ml-6 mt-1.5 space-y-1">
                {PACTORA_CLAUSE_AGENTS.map((agent) => {
                  const status = agentProgress![agent];
                  const dotClass = !status
                    ? 'bg-zinc-700'
                    : status === 'active'
                    ? 'animate-pulse bg-amber-400'
                    : status === 'done'
                    ? 'bg-emerald-400'
                    : 'bg-red-400';
                  return (
                    <li key={agent} className="flex items-center gap-2 text-xs text-zinc-400">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
                      <span>{agent}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </li>
        ))}
        <li className="flex items-center gap-3 text-zinc-300">
          <span className={`h-2.5 w-2.5 rounded-full ${analysis.uploadStatus === 'complete' ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
          <span>Analysis ready</span>
        </li>
      </ol>
    </div>
  );
}

export default function NewDealPage() {
  const analysis = useDocumentAnalysis();
  const actions = useDocumentAnalysisActions();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSignupWall, setShowSignupWall] = useState(false);
  const [manualClauseText, setManualClauseText] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    // Restore pasted text if the page reloaded mid-analysis.
    // If the store already has a completed analysis, the text was already processed.
    return sessionStorage.getItem('pactora.manualClauseText') ?? '';
  });

  useEffect(() => {
    sessionStorage.setItem('pactora.manualClauseText', manualClauseText);
  }, [manualClauseText]);

  // Show a banner if stale data from a previous review is present on arrival.
  const [showStaleBanner, setShowStaleBanner] = useState<boolean>(
    () => analysis.uploadStatus === 'complete'
  );

  function handleStartFresh() {
    clearPersistedState();
    sessionStorage.removeItem('pactora.manualClauseText');
    actions.reset();
    setManualClauseText('');
    setShowStaleBanner(false);
    setPendingText(null);
    setAnalysisRunning(false);
  }

  const [hasAcceptedLegalNotice, setHasAcceptedLegalNotice] = useState<boolean>(false);
  const [hasConfirmedDataCaution, setHasConfirmedDataCaution] = useState<boolean>(false);
  const [agentProgress, setAgentProgress] = useState<AgentProgressMap>({});
  const [isDragging, setIsDragging] = useState(false);
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);

  // Auto-scroll to Step 2 when extraction finishes and pendingText is first set.
  const step2Ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (pendingText !== null) {
      setTimeout(() => step2Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [pendingText]);

  // Save completed analyses to deals history (localStorage + server for signed-in users).
  // Keyed by documentId so a stale localStorage state loaded on arrival doesn't get re-saved.
  const savedDealId = useRef('');
  useEffect(() => {
    if (analysis.uploadStatus === 'complete' && analysis.documentId !== savedDealId.current) {
      savedDealId.current = analysis.documentId;
      saveDeal(analysis);
      // Server save for signed-in users. Stores the returned deal ID in
      // sessionStorage so the email capture banner can link back to it.
      fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: analysis }),
      })
        .then((r) => r.ok ? r.json() as Promise<{ deal?: { id: string } }> : null)
        .then((data) => {
          if (data?.deal?.id) {
            sessionStorage.setItem('pactora.last_server_deal_id', data.deal.id);
          }
        })
        .catch(() => {/* non-fatal */});
    }
  }, [analysis.uploadStatus, analysis.documentId, analysis]);

  const commercialContext = analysis.commercialContext;
  const selectedFileName = analysis.documentMeta.fileName ?? '';
  const canContinue = pendingText !== null && !analysisRunning && hasAcceptedLegalNotice && hasConfirmedDataCaution;
  const runClauseAnalysis = async (text: string) => {
    setAgentProgress({});
    actions.analysisStarted();
    try {
      const res = await apiFetch('/api/contracts/analyze-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, jurisdiction: analysis.commercialContext.jurisdiction }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Clause analysis failed.');
      }

      if (!res.body) throw new Error('No response stream from analysis.');

      // Read the SSE stream. Each agent emits agent_start, then agent_result or agent_error.
      // We append each flag immediately on agent_result for progressive rendering,
      // then hydrateAnalysis on analysis_complete to set the final canonical state.
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
            const event = JSON.parse(json) as AgentEvent;
            if (event.type === 'agent_start') {
              setAgentProgress((prev) => ({ ...prev, [event.clauseType]: 'active' }));
            } else if (event.type === 'agent_result') {
              if (event.flag) actions.appendFlag(event.flag);
              setAgentProgress((prev) => ({ ...prev, [event.clauseType]: 'done' }));
            } else if (event.type === 'agent_error') {
              setAgentProgress((prev) => ({ ...prev, [event.clauseType]: 'error' }));
            } else if (event.type === 'contract_type_detected') {
              actions.setContractType(event.contractType);
            } else if (event.type === 'analysis_complete' && Array.isArray(event.flags)) {
              actions.hydrateAnalysis({
                flags: event.flags,
                crossClauseRisks: event.crossClauseRisks ?? [],
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

    if (payload.sourceFileType) {
      actions.setSourceFileType(payload.sourceFileType);
    }
    if (payload.docxBuffer) {
      try {
        sessionStorage.setItem('pactora.docxBuffer', payload.docxBuffer);
      } catch (err) {
        console.error('[extract] sessionStorage quota exceeded — DOCX buffer not stored; export will fall back to markup schedule:', err);
        try {
          sessionStorage.setItem('pactora.docxBufferUnavailable', 'true');
        } catch {
          // Storage completely full — flag also unwritable; download-redline-button will handle missing buffer gracefully
        }
      }
    }

    if (payload.contractText) {
      setPendingText(payload.contractText);
    } else {
      actions.analysisFailed('Analysis incomplete: no raw text returned by parser.');
    }
  };

  const confirmAndAnalyse = async () => {
    if (!pendingText) return;
    setAnalysisRunning(true);
    try {
      await runClauseAnalysis(pendingText);
    } finally {
      setAnalysisRunning(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      actions.reset();
      setUploadError(null);
      return;
    }

    setUploadError(null);
    setPendingText(null);
    actions.uploadStarted(file);
    trackEvent('contract_upload_started', '/deals/new');

    try {
      const formData = new FormData();
      formData.append('contract', file);

      const response = await apiFetch('/api/contracts/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (response.status === 402 && payload?.error === 'free_limit_reached') {
          setShowSignupWall(true);
          return;
        }
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

  const handleContractUpload = (event: ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    void handleFile(event.target.files?.[0]);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const handleManualClauseSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = manualClauseText.trim();

    // If a file is already selected, manual submit is a no-op — the file takes precedence.
    if (selectedFileName) return;

    if (text.length < 20) {
      const message = 'Please paste at least 20 characters of contract clauses.';
      setUploadError(message);
      actions.setError(message);
      return;
    }

    setUploadError(null);
    setPendingText(null);
    actions.uploadStarted({ name: 'Pasted contract clauses', type: 'text/plain' });
    trackEvent('manual_clause_entry_started', '/deals/new');

    try {
      const response = await apiFetch('/api/contracts/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceName: 'Pasted contract clauses' }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        if (response.status === 402 && payload?.error === 'free_limit_reached') {
          setShowSignupWall(true);
          return;
        }
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

  if (showSignupWall) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">You've used your free review</h2>
          <p className="mt-3 text-sm text-zinc-400">
            Create a free account to review unlimited contracts — and your analyses will be saved across all your devices.
          </p>
          <a
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200"
          >
            Create free account
          </a>
          <a
            href="/deals"
            className="mt-3 inline-block text-xs text-zinc-500 hover:text-zinc-300"
          >
            Back to your deals
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Review a contract</h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            Upload your draft contract or paste key clauses manually, confirm the extracted commercial context, then view your contract analysis.
          </p>
        </header>

        {showStaleBanner && (
          <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-amber-100">
                Data from a previous review is still loaded.{' '}
                <button onClick={handleStartFresh} className="underline hover:text-white">
                  Start fresh
                </button>{' '}
                — or clear your browser cache / site data if it persists.
              </p>
              <button
                onClick={() => setShowStaleBanner(false)}
                className="shrink-0 text-amber-400 hover:text-amber-100"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Step 1 of 3</p>
          <h2 className="mt-1 text-lg font-medium text-white">Add contract content</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Upload your contract (PDF, DOCX, or legacy DOC) or paste the clauses you want Pactora to review. Pactora will only display extracted data it can support.
          </p>

          <div className="mt-5">
            <label
              htmlFor="contractUpload"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                isDragging
                  ? 'border-white/40 bg-white/5'
                  : selectedFileName
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-zinc-700 bg-zinc-950 hover:border-zinc-500 hover:bg-zinc-900/50'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {selectedFileName ? (
                <div className="text-center">
                  <p className="text-sm font-medium text-white">{selectedFileName}</p>
                  <p className="mt-1 text-xs text-zinc-400">Click or drop a file to replace</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-200">
                    {isDragging ? 'Drop your contract here' : 'Drop your contract here, or click to browse'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">PDF, DOCX, or DOC · max 20 MB</p>
                </div>
              )}
              <input
                id="contractUpload"
                type="file"
                accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={handleContractUpload}
                className="sr-only"
              />
            </label>

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
                aria-invalid={uploadError !== null && manualClauseText.trim().length < 20 ? true : undefined}
                aria-describedby={uploadError ? 'upload-error' : undefined}
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-700"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-zinc-500">Manual mode accepts pasted text when a file is unavailable or you only need to review selected clauses.</p>
                <button
                  type="submit"
                  disabled={!!selectedFileName || analysis.uploadStatus === 'uploading' || analysis.uploadStatus === 'processing'}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  Analyse clauses
                </button>
              </div>
            </form>

            {uploadError ? (
              <div id="upload-error" role="alert" className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm font-medium text-red-300">{uploadError}</p>
                <p className="mt-1 text-xs text-red-400">Please select a text-based PDF, DOCX, or DOC under 20 MB, or paste at least 20 characters of clause text.</p>
              </div>
            ) : null}
            {analysis.uploadStatus === 'uploading' && (
              <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Reading your contract…
              </div>
            )}
            {pendingText !== null && analysis.uploadStatus !== 'complete' && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <span className="shrink-0 text-emerald-400">✓</span>
                Contract read — review the extracted details below, tick both boxes, then click <strong>Confirm and analyse</strong>.
              </div>
            )}
          </div>
        </section>

        {pendingText !== null && (
          <>
            {analysis.extractionWarnings.length > 0 ? (
              <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                <h2 className="font-semibold text-zinc-100">Extraction diagnostics</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {analysis.extractionWarnings.map((warning) => (
                    <li key={`${warning.field}-${warning.reason}`}>{warning.reason}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {analysis.uploadStatus === 'complete' && warnings.length > 0 ? (
              <section className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                <h2 className="font-semibold">Partial analysis warning</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </section>
            ) : null}

            <section ref={step2Ref} className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Step 2 of 3</p>
              <h2 className="mt-1 text-lg font-medium text-white">Extracted commercial context</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Empty fields mean the parser did not identify that value. Pactora will not substitute fake defaults.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ReadOnlyField label="Annual contract value" value={formatOptionalMoneyValue(commercialContext.acv.value)} empty="Not detected" evidence={commercialContext.acv.evidence} />
                <ReadOnlyField label="Initial term" value={commercialContext.termMonths.value === null ? '' : `${commercialContext.termMonths.value} months`} empty="Not detected" evidence={commercialContext.termMonths.evidence} />
                <ReadOnlyField label="Insurance cover" value={formatOptionalMoneyValue(commercialContext.insuranceCover.value)} empty="Not detected" evidence={commercialContext.insuranceCover.evidence} />
                <ReadOnlyField label="Data type" value={commercialContext.dataType.value ?? ''} empty="Not detected" evidence={commercialContext.dataType.evidence} />
                <ReadOnlyField label="Governing law" value={analysis.extractedTerms.governingLaw} empty="No governing law identified" />
                <ReadOnlyField label="Termination notice" value={analysis.extractedTerms.terminationNotice} empty="Clause not detected" />
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-400" htmlFor="jurisdiction-select">
                  Your jurisdiction
                </label>
                <p className="mt-1 text-xs text-zinc-500">Which country&apos;s law applies to you as the reviewing party? This calibrates which legal rules the analysis applies.</p>
                <select
                  id="jurisdiction-select"
                  value={commercialContext.jurisdiction ?? ''}
                  onChange={(e) => actions.setJurisdiction((e.target.value as Jurisdiction) || null)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-blue-500 focus:outline-none"
                  disabled={analysisRunning || analysis.uploadStatus === 'complete'}
                >
                  <option value="">Select jurisdiction…</option>
                  {(Object.keys(JURISDICTION_LABELS) as Jurisdiction[]).map((j) => (
                    <option key={j} value={j}>{JURISDICTION_LABELS[j]}</option>
                  ))}
                </select>
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
                  <input type="checkbox" required checked={hasAcceptedLegalNotice} onChange={(event) => setHasAcceptedLegalNotice(event.target.checked)} disabled={analysisRunning || analysis.uploadStatus === 'complete'} className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-white" />
                  <span>I confirm that I am authorised to upload or paste this material and understand Pactora outputs may be incomplete or inaccurate.</span>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-200">
                  <input type="checkbox" required checked={hasConfirmedDataCaution} onChange={(event) => setHasConfirmedDataCaution(event.target.checked)} disabled={analysisRunning || analysis.uploadStatus === 'complete'} className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-white" />
                  <span>I understand extracted values are parser outputs and should be checked before legal or commercial decisions.</span>
                </label>
              </div>
            </section>

            {!canContinue && !analysisRunning && analysis.uploadStatus !== 'complete' && (
              <div className="mb-4 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300">
                <p className="font-medium text-zinc-100">Before you can continue:</p>
                <ul className="mt-2 space-y-1">
                  <li className={hasAcceptedLegalNotice ? 'text-emerald-400' : 'text-zinc-400'}>
                    {hasAcceptedLegalNotice ? '✓' : '○'} Confirm authorisation and accuracy notice
                  </li>
                  <li className={hasConfirmedDataCaution ? 'text-emerald-400' : 'text-zinc-400'}>
                    {hasConfirmedDataCaution ? '✓' : '○'} Confirm data caution
                  </li>
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              {analysis.uploadStatus === 'complete' ? (
                <Link href="/review/summary" className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400">
                  View contract analysis →
                </Link>
              ) : (
                <button
                  onClick={() => void confirmAndAnalyse()}
                  disabled={!canContinue}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                >
                  {analysisRunning ? 'Analysing…' : 'Confirm and analyse'}
                </button>
              )}
            </div>

            {(analysisRunning || analysis.uploadStatus === 'complete') && (
              <ProcessingPipeline analysis={analysis} agentProgress={agentProgress} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ReadOnlyField({ label, value, empty, evidence }: { label: string; value?: string; empty: string; evidence?: string | null }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-2 text-sm font-semibold ${value ? 'text-zinc-100' : 'text-zinc-500'}`}>{value || empty}</div>
      {evidence ? <div className="mt-2 text-xs text-zinc-500">Evidence: {evidence}</div> : null}
    </div>
  );
}
