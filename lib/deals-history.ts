import type { DocumentAnalysisState } from './document-analysis-store';

export type DealHistoryEntry = {
  id: string;
  fileName: string;
  analyzedAt: string;
  riskCounts: { high: number; medium: number; low: number };
  clauseCount: number;
  snapshot: DocumentAnalysisState;
};

const HISTORY_KEY = 'pactora.deals.history';
const MAX_ENTRIES = 20;

export function saveDeal(state: DocumentAnalysisState): void {
  if (typeof window === 'undefined') return;

  const clauses = state.clauses ?? [];
  const entry: DealHistoryEntry = {
    id: `deal_${Date.now()}`,
    fileName: state.documentMeta.fileName ?? 'Untitled contract',
    analyzedAt: new Date().toISOString(),
    riskCounts: {
      high: clauses.filter((c) => c.riskLevel === 'High').length,
      medium: clauses.filter((c) => c.riskLevel === 'Medium').length,
      low: clauses.filter((c) => c.riskLevel === 'Low').length,
    },
    clauseCount: clauses.length,
    snapshot: state,
  };

  // Drop any earlier entry for the same filename reviewed in the last minute
  // (prevents double-saving on hot reload or re-render).
  const existing = listDeals().filter(
    (e) =>
      e.fileName !== entry.fileName ||
      Math.abs(new Date(e.analyzedAt).getTime() - Date.now()) > 60_000,
  );

  try {
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([entry, ...existing].slice(0, MAX_ENTRIES)),
    );
  } catch {
    // Quota exceeded — keep only the 5 most recent
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...existing].slice(0, 5)));
  }
}

export function listDeals(): DealHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as DealHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function getDeal(id: string): DealHistoryEntry | null {
  return listDeals().find((e) => e.id === id) ?? null;
}
