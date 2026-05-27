'use client';

import { extractedValue, useDocumentAnalysisStore, CONTRACT_TYPES } from '@/lib/document-analysis-store';
import type { ContractType } from '@/lib/document-analysis-store';
import type { ExtractedField } from '@/lib/contract-extraction';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const isToday = date.toDateString() === new Date().toDateString();
  return isToday
    ? `today at ${date.toLocaleString('en-GB', { timeStyle: 'short' })}`
    : date.toLocaleString('en-GB', { dateStyle: 'medium' });
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
}

export function formatOptionalMoneyField(field: ExtractedField<number>) {
  const value = extractedValue(field);
  return value === null ? 'Not detected' : formatMoney(value);
}

export function formatOptionalMonthsField(field: ExtractedField<number>) {
  const value = extractedValue(field);
  return value === null ? 'Not detected' : `${value} months`;
}

export function formatOptionalTextField<T extends string>(field: ExtractedField<T>) {
  const value = extractedValue(field);
  return value ?? 'Not detected';
}

export function ActiveDocumentBanner() {
  const { state, actions } = useDocumentAnalysisStore();
  const { activeDocument, contractType } = state;

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300">
      <span className="font-semibold text-zinc-100">Active document:</span>{' '}
      {activeDocument ? (
        <>
          <span>{activeDocument.fileName}</span>
          {activeDocument.uploadedAt && (
            <>
              <span className="mx-2 text-zinc-600">•</span>
              <span>Uploaded {formatDate(activeDocument.uploadedAt)}</span>
            </>
          )}
        </>
      ) : (
        <span>None selected</span>
      )}
      {contractType && (
        <div className="mt-2 flex items-center gap-2">
          <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400">
            {contractType}
          </span>
          <select
            value={contractType}
            onChange={(e) => actions.setContractType(e.target.value as ContractType)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400 hover:border-zinc-500 cursor-pointer"
            aria-label="Override contract type"
          >
            {CONTRACT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
