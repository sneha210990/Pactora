'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import type { ClauseFlag, RiskLevel } from '@/lib/clause-analysis';
export type { ClauseFlag };
import type { ExtractedContractValues, ExtractedField } from '@/lib/contract-extraction';

export type Clause = {
  id: string;
  type: string;
  text?: string;
  riskLevel?: RiskLevel;
  explanation?: string;
};

export type Risk = {
  id: string;
  clauseType: string;
  level: RiskLevel;
  description: string;
};

export type Obligation = {
  id: string;
  title: string;
  description?: string;
  owner?: string;
  dueDate?: string;
};

export type Recommendation = {
  id: string;
  clauseType?: string;
  text: string;
  priority?: RiskLevel;
};

export type ExtractionWarning = {
  field: string;
  reason: string;
};

export type ActiveDocument = {
  id: string;
  fileName: string;
  uploadedAt: string;
};

export type CommercialContext = {
  acv: ExtractedField<number>;
  termMonths: ExtractedField<number>;
  insuranceCover: ExtractedField<number>;
  dataType: ExtractedField<'standard' | 'personal' | 'sensitive'>;
  liabilityCap: number | null;
};

export type DocumentAnalysisState = {
  documentId: string;
  activeDocument: ActiveDocument | null;
  uploadStatus: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  documentMeta: {
    fileName?: string;
    fileType?: string;
    uploadedAt?: string;
    pageCount?: number;
  };
  extractedParties: {
    client?: string;
    vendor?: string;
    counterparty?: string;
  };
  extractedTerms: {
    effectiveDate?: string;
    governingLaw?: string;
    terminationNotice?: string;
    renewalTerm?: string;
  };
  clauses: Clause[];
  risks: Risk[];
  obligations: Obligation[];
  recommendations: Recommendation[];
  summary?: string;
  confidenceScores?: {
    overall?: number;
    clauses?: number;
    risks?: number;
  };
  rawText?: string;
  processingSteps: {
    upload: boolean;
    extraction: boolean;
    clauseDetection: boolean;
    riskAnalysis: boolean;
    recommendations: boolean;
  };
  errors?: string[];
  commercialContext: CommercialContext;
  extractionWarnings: ExtractionWarning[];
  manualFlags?: ClauseFlag[];
  diagnostics?: {
    missingFields: string[];
    lastPayloadShape?: string[];
    hydrationWarnings: string[];
  };
};

type Action =
  | { type: 'reset' }
  | { type: 'resetReviewState' }
  | { type: 'uploadStarted'; file: { name: string; type: string } }
  | { type: 'extractionHydrated'; payload: ExtractionPayload }
  | { type: 'analysisStarted' }
  | { type: 'analysisHydrated'; analysis: AnalysisPayload }
  | { type: 'analysisFailed'; error: string }
  | { type: 'setError'; error: string }
  | { type: 'setLiabilityCap'; value: number | null }
  | { type: 'setManualReviewFlag'; flag: ClauseFlag }
  | { type: 'appendFlag'; flag: ClauseFlag };

type ExtractionPayload = {
  documentId?: string;
  detectedValues?: ExtractedContractValues;
  contractText?: string;
  documentMeta?: DocumentAnalysisState['documentMeta'];
  extractedParties?: DocumentAnalysisState['extractedParties'];
  extractedTerms?: DocumentAnalysisState['extractedTerms'];
  summary?: string;
};

type AnalysisPayload = {
  flags?: ClauseFlag[];
  analyzedAt?: string;
};

const STORAGE_KEY = 'pactora.documentAnalysis.v2';
const LEGACY_STORAGE_KEY = 'pactora.documentAnalysis.v1';

const emptySteps: DocumentAnalysisState['processingSteps'] = {
  upload: false,
  extraction: false,
  clauseDetection: false,
  riskAnalysis: false,
  recommendations: false,
};

function emptyExtractedField<T>(): ExtractedField<T> {
  return { value: null, confidence: null, evidence: null, extractionMethod: null };
}

export function emptyCommercialContext(): CommercialContext {
  return {
    acv: emptyExtractedField<number>(),
    termMonths: emptyExtractedField<number>(),
    insuranceCover: emptyExtractedField<number>(),
    dataType: emptyExtractedField<'standard' | 'personal' | 'sensitive'>(),
    liabilityCap: null,
  };
}

export const emptyDocumentAnalysisState: DocumentAnalysisState = {
  documentId: '',
  activeDocument: null,
  uploadStatus: 'idle',
  documentMeta: {},
  extractedParties: {},
  extractedTerms: {},
  clauses: [],
  risks: [],
  obligations: [],
  recommendations: [],
  processingSteps: emptySteps,
  errors: [],
  commercialContext: emptyCommercialContext(),
  extractionWarnings: [],
  manualFlags: [],
  diagnostics: {
    missingFields: [],
    hydrationWarnings: [],
  },
};

type StoredDocumentEnvelope = {
  version: 2;
  activeDocumentId: string | null;
  state: DocumentAnalysisState;
};

function stableDocumentId(fileName?: string) {
  const seed = `${fileName ?? 'document'}-${Date.now()}`;
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return seed.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function payloadShape(payload: unknown) {
  if (!payload || typeof payload !== 'object') return [];
  return Object.keys(payload as Record<string, unknown>).sort();
}

function missingFields(state: DocumentAnalysisState) {
  const missing: string[] = [];
  if (!state.documentMeta.fileName) missing.push('documentMeta.fileName');
  if (!state.extractedTerms.governingLaw) missing.push('extractedTerms.governingLaw');
  if (!state.extractedTerms.terminationNotice) missing.push('extractedTerms.terminationNotice');
  if (state.clauses.length === 0) missing.push('clauses');
  if (state.risks.length === 0) missing.push('risks');
  if (state.recommendations.length === 0) missing.push('recommendations');
  return missing;
}

function logDiagnostics(state: DocumentAnalysisState, event: string, payload?: unknown) {
  if (process.env.NODE_ENV === 'production') return;
  if (payload) console.info('[PACTORA] Parser payload shape', { event, keys: payloadShape(payload) });
  const missing = missingFields(state);
  if (missing.length > 0) console.warn('[PACTORA] Missing extraction fields', { event, missing });
}

function toCanonicalAnalysis(state: DocumentAnalysisState, analysis: AnalysisPayload): DocumentAnalysisState {
  const flags = Array.isArray(analysis.flags) ? analysis.flags : [];
  const clauses = flags.map((flag, index): Clause => ({
    id: `${state.documentId || 'document'}-clause-${index}`,
    type: flag.clauseType,
    text: flag.clauseText ?? flag.problematicLanguage,
    riskLevel: flag.riskLevel,
    explanation: flag.plainEnglish,
  }));
  const risks = flags.map((flag, index): Risk => ({
    id: `${state.documentId || 'document'}-risk-${index}`,
    clauseType: flag.clauseType,
    level: flag.riskLevel,
    description: flag.plainEnglish,
  }));
  const recommendations = flags
    .filter((flag) => flag.negotiationPoint)
    .map((flag, index): Recommendation => ({
      id: `${state.documentId || 'document'}-recommendation-${index}`,
      clauseType: flag.clauseType,
      text: flag.negotiationPoint,
      priority: flag.riskLevel,
    }));

  return {
    ...state,
    uploadStatus: 'complete',
    clauses,
    risks,
    recommendations,
    confidenceScores: {
      ...state.confidenceScores,
      clauses: flags.length > 0 ? 0.8 : undefined,
      risks: flags.length > 0 ? 0.8 : undefined,
      overall: flags.length > 0 ? 0.8 : state.confidenceScores?.overall,
    },
    processingSteps: {
      upload: true,
      extraction: true,
      clauseDetection: true,
      riskAnalysis: true,
      recommendations: true,
    },
    diagnostics: {
      missingFields: [],
      lastPayloadShape: payloadShape(analysis),
      hydrationWarnings: flags.length === 0 ? ['analysis returned no clause flags'] : [],
    },
  };
}


function asExtractedField<T>(raw: unknown): ExtractedField<T> {
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const candidate = raw as Partial<ExtractedField<T>>;
    return {
      value: (candidate.value ?? null) as T | null,
      confidence: typeof candidate.confidence === 'number' ? candidate.confidence : null,
      evidence: typeof candidate.evidence === 'string' ? candidate.evidence : null,
      extractionMethod:
        candidate.extractionMethod === 'regex' || candidate.extractionMethod === 'llm' || candidate.extractionMethod === 'hybrid'
          ? candidate.extractionMethod
          : null,
    };
  }

  return {
    value: raw === undefined ? null : (raw as T | null),
    confidence: raw === undefined || raw === null ? null : 0.5,
    evidence: null,
    extractionMethod: raw === undefined || raw === null ? null : 'regex',
  };
}

function normalizeCommercialContext(raw?: Partial<ExtractedContractValues> & { liabilityCap?: number | null }): CommercialContext {
  return {
    acv: asExtractedField<number>(raw?.acv),
    termMonths: asExtractedField<number>(raw?.termMonths),
    insuranceCover: asExtractedField<number>(raw?.insuranceCover),
    dataType: asExtractedField<'standard' | 'personal' | 'sensitive'>(raw?.dataType),
    liabilityCap: typeof raw?.liabilityCap === 'number' ? raw.liabilityCap : null,
  };
}

function extractionWarningsFromContext(context: CommercialContext): ExtractionWarning[] {
  const warnings: ExtractionWarning[] = [];
  if (context.acv.value === null || (context.acv.confidence ?? 0) < 0.7) warnings.push({ field: 'acv', reason: 'ACV not confidently detected' });
  if (context.termMonths.value === null || (context.termMonths.confidence ?? 0) < 0.7) warnings.push({ field: 'termMonths', reason: 'Contract term ambiguous' });
  if (context.insuranceCover.value === null) warnings.push({ field: 'insuranceCover', reason: 'No insurance clause found' });
  if (context.dataType.value === null) warnings.push({ field: 'dataType', reason: 'Data category not detected' });
  return warnings;
}

function reviewStateReset(state: DocumentAnalysisState): DocumentAnalysisState {
  // In legal tech, stale extracted facts can make a review look more certain than the evidence supports.
  // Keep document identity and raw extraction, but clear every downstream judgement before re-running review.
  return {
    ...state,
    clauses: [],
    risks: [],
    obligations: [],
    recommendations: [],
    summary: undefined,
    confidenceScores: undefined,
    commercialContext: emptyCommercialContext(),
    extractionWarnings: [],
    processingSteps: { ...emptySteps, upload: state.processingSteps.upload },
  };
}

function reducer(state: DocumentAnalysisState, action: Action): DocumentAnalysisState {
  let next = state;

  switch (action.type) {
    case 'reset':
      next = emptyDocumentAnalysisState;
      break;
    case 'resetReviewState':
      next = reviewStateReset(state);
      break;
    case 'uploadStarted': {
      const documentId = stableDocumentId(action.file.name);
      const uploadedAt = new Date().toISOString();
      // Starting a new document must sever all prior extracted and review state; stale legal facts are more dangerous than blanks.
      next = {
        ...emptyDocumentAnalysisState,
        documentId,
        activeDocument: { id: documentId, fileName: action.file.name, uploadedAt },
        uploadStatus: 'uploading',
        documentMeta: {
          fileName: action.file.name,
          fileType: action.file.type,
          uploadedAt,
        },
        processingSteps: { ...emptySteps, upload: true },
      };
      break;
    }
    case 'extractionHydrated': {
      const documentId = action.payload.documentId ?? state.documentId ?? stableDocumentId(action.payload.documentMeta?.fileName);
      const fileName = action.payload.documentMeta?.fileName ?? state.documentMeta.fileName ?? 'Unknown document';
      const uploadedAt = action.payload.documentMeta?.uploadedAt ?? state.documentMeta.uploadedAt ?? new Date().toISOString();
      const commercialContext = normalizeCommercialContext(action.payload.detectedValues);
      // Null is safer than fake defaults: review UI can say "Not detected" instead of inventing £0, 0 months, or standard data.
      next = {
        ...reviewStateReset(state),
        documentId,
        activeDocument: { id: documentId, fileName, uploadedAt },
        uploadStatus: 'processing',
        documentMeta: { ...state.documentMeta, ...action.payload.documentMeta, fileName, uploadedAt },
        extractedParties: { ...action.payload.extractedParties },
        extractedTerms: { ...action.payload.extractedTerms },
        summary: action.payload.summary,
        rawText: action.payload.contractText,
        commercialContext,
        extractionWarnings: extractionWarningsFromContext(commercialContext),
        processingSteps: { ...emptySteps, upload: true, extraction: true },
        errors: state.errors ?? [],
        diagnostics: {
          missingFields: [],
          lastPayloadShape: payloadShape(action.payload),
          hydrationWarnings: [],
        },
      };
      break;
    }
    case 'analysisStarted':
      next = {
        ...state,
        uploadStatus: 'processing',
        processingSteps: { ...state.processingSteps, clauseDetection: true },
      };
      break;
    case 'analysisHydrated':
      next = toCanonicalAnalysis(state, action.analysis);
      break;
    case 'analysisFailed':
      next = {
        ...state,
        uploadStatus: state.rawText ? 'complete' : 'error',
        processingSteps: { ...state.processingSteps, clauseDetection: true },
        errors: [...(state.errors ?? []), action.error],
        diagnostics: {
          missingFields: missingFields(state),
          lastPayloadShape: state.diagnostics?.lastPayloadShape,
          hydrationWarnings: [...(state.diagnostics?.hydrationWarnings ?? []), action.error],
        },
      };
      break;
    case 'setError':
      next = { ...state, uploadStatus: 'error', errors: [...(state.errors ?? []), action.error] };
      break;
    case 'setLiabilityCap':
      next = {
        ...state,
        commercialContext: {
          ...state.commercialContext,
          liabilityCap: action.value,
        },
      };
      break;
    case 'setManualReviewFlag': {
      const existing = state.manualFlags ?? [];
      const others = existing.filter((f) => f.clauseType !== action.flag.clauseType);
      next = { ...state, manualFlags: [...others, action.flag] };
      break;
    }
    case 'appendFlag': {
      const flag = action.flag;
      const idx = state.clauses.length;
      const docId = state.documentId || 'document';
      const newClause: Clause = {
        id: `${docId}-clause-${idx}`,
        type: flag.clauseType,
        text: flag.clauseText ?? flag.problematicLanguage,
        riskLevel: flag.riskLevel,
        explanation: flag.plainEnglish,
      };
      const newRisk: Risk = {
        id: `${docId}-risk-${idx}`,
        clauseType: flag.clauseType,
        level: flag.riskLevel,
        description: flag.plainEnglish,
      };
      const newRecs: Recommendation[] = flag.negotiationPoint
        ? [{ id: `${docId}-recommendation-${state.recommendations.length}`, clauseType: flag.clauseType, text: flag.negotiationPoint, priority: flag.riskLevel }]
        : [];
      next = {
        ...state,
        clauses: [...state.clauses, newClause],
        risks: [...state.risks, newRisk],
        recommendations: [...state.recommendations, ...newRecs],
      };
      break;
    }
  }

  next = {
    ...next,
    diagnostics: {
      ...next.diagnostics,
      missingFields: missingFields(next),
      hydrationWarnings: next.diagnostics?.hydrationWarnings ?? [],
    },
  };
  logDiagnostics(next, action.type, 'payload' in action ? action.payload : 'analysis' in action ? action.analysis : undefined);
  return next;
}

function normalizeStoredState(rawState: Partial<DocumentAnalysisState>): DocumentAnalysisState {
  const state = { ...emptyDocumentAnalysisState, ...rawState };
  const documentId = state.documentId || rawState.activeDocument?.id || '';
  const uploadedAt = state.documentMeta.uploadedAt ?? rawState.activeDocument?.uploadedAt ?? '';
  return {
    ...state,
    documentId,
    activeDocument: documentId && (state.documentMeta.fileName || rawState.activeDocument?.fileName)
      ? {
          id: documentId,
          fileName: state.documentMeta.fileName ?? rawState.activeDocument?.fileName ?? 'Unknown document',
          uploadedAt,
        }
      : null,
    commercialContext: normalizeCommercialContext(rawState.commercialContext as Partial<ExtractedContractValues> & { liabilityCap?: number | null }),
    extractionWarnings: rawState.extractionWarnings ?? extractionWarningsFromContext(normalizeCommercialContext(rawState.commercialContext as Partial<ExtractedContractValues> & { liabilityCap?: number | null })),
  };
}

function parseStoredState(raw: string): DocumentAnalysisState {
  const parsed = JSON.parse(raw) as Partial<DocumentAnalysisState> | StoredDocumentEnvelope;
  if ('version' in parsed && parsed.version === 2 && parsed.state) {
    const state = normalizeStoredState(parsed.state);
    return parsed.activeDocumentId === state.activeDocument?.id ? state : emptyDocumentAnalysisState;
  }
  return normalizeStoredState(parsed as Partial<DocumentAnalysisState>);
}

function readStoredState() {
  if (typeof window === 'undefined') return emptyDocumentAnalysisState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return emptyDocumentAnalysisState;
    return parseStoredState(raw);
  } catch {
    console.warn('[PACTORA] Hydration mismatch: stored document analysis state could not be parsed');
    return emptyDocumentAnalysisState;
  }
}

type StoreValue = {
  state: DocumentAnalysisState;
  actions: {
    reset: () => void;
    resetReviewState: () => void;
    uploadStarted: (file: Pick<File, 'name' | 'type'>) => void;
    hydrateExtraction: (payload: ExtractionPayload) => void;
    analysisStarted: () => void;
    hydrateAnalysis: (analysis: AnalysisPayload) => void;
    analysisFailed: (error: string) => void;
    setError: (error: string) => void;
    setLiabilityCap: (value: number | null) => void;
    setManualReviewFlag: (flag: ClauseFlag) => void;
    appendFlag: (flag: ClauseFlag) => void;
  };
};

const DocumentAnalysisContext = createContext<StoreValue | null>(null);

export function DocumentAnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, emptyDocumentAnalysisState, readStoredState);

  useEffect(() => {
    const envelope: StoredDocumentEnvelope = {
      version: 2,
      activeDocumentId: state.activeDocument?.id ?? null,
      state,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  }, [state]);

  const actions = useMemo<StoreValue['actions']>(() => ({
    reset: () => dispatch({ type: 'reset' }),
    resetReviewState: () => dispatch({ type: 'resetReviewState' }),
    uploadStarted: (file) => dispatch({ type: 'uploadStarted', file: { name: file.name, type: file.type } }),
    hydrateExtraction: (payload) => dispatch({ type: 'extractionHydrated', payload }),
    analysisStarted: () => dispatch({ type: 'analysisStarted' }),
    hydrateAnalysis: (analysis) => dispatch({ type: 'analysisHydrated', analysis }),
    analysisFailed: (error) => dispatch({ type: 'analysisFailed', error }),
    setError: (error) => dispatch({ type: 'setError', error }),
    setLiabilityCap: (value) => dispatch({ type: 'setLiabilityCap', value }),
    setManualReviewFlag: (flag) => dispatch({ type: 'setManualReviewFlag', flag }),
    appendFlag: (flag) => dispatch({ type: 'appendFlag', flag }),
  }), []);

  const value = useMemo(() => ({ state, actions }), [actions, state]);
  return <DocumentAnalysisContext.Provider value={value}>{children}</DocumentAnalysisContext.Provider>;
}

export function useDocumentAnalysisStore() {
  const context = useContext(DocumentAnalysisContext);
  if (!context) throw new Error('useDocumentAnalysisStore must be used within DocumentAnalysisProvider');
  return context;
}

export function useDocumentAnalysis() {
  return useDocumentAnalysisStore().state;
}

export function useDocumentAnalysisActions() {
  return useDocumentAnalysisStore().actions;
}

export function useDocumentCommercialContext() {
  return useDocumentAnalysis().commercialContext;
}

export function extractedValue<T>(field: ExtractedField<T> | T | null | undefined): T | null {
  if (field && typeof field === 'object' && 'value' in field) return field.value as T | null;
  return field === undefined ? null : (field as T | null);
}

export function useClauseByType(clauseType: string) {
  const state = useDocumentAnalysis();
  return useMemo(
    () => state.clauses.find((clause) => clause.type.toLowerCase().includes(clauseType.toLowerCase())) ?? null,
    [clauseType, state.clauses],
  );
}

export function useRiskByType(clauseType: string) {
  const state = useDocumentAnalysis();
  return useMemo(
    () => state.risks.find((risk) => risk.clauseType.toLowerCase().includes(clauseType.toLowerCase())) ?? null,
    [clauseType, state.risks],
  );
}

export function warnIfFallbackContractData(componentName: string, usingFallback: boolean) {
  if (usingFallback) console.warn('[PACTORA] Component rendered with fallback contract data', { componentName });
}
