'use client';

import { extractedValue, useDocumentAnalysis } from '@/lib/document-analysis-store';
import type { ExtractedField } from '@/lib/contract-extraction';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
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
  const { activeDocument } = useDocumentAnalysis();

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300">
      <span className="font-semibold text-zinc-100">Active document:</span>{' '}
      {activeDocument ? (
        <>
          <span>{activeDocument.fileName}</span>
          <span className="mx-2 text-zinc-600">•</span>
          <span>ID: {activeDocument.id.slice(0, 8)}</span>
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
    </div>
  );
}
