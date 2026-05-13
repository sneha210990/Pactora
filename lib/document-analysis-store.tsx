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
import type { ExtractedContractValues } from '@/lib/contract-extraction';

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

export type DocumentAnalysisState = {
  documentId: string;
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
  commercialContext?: {
    acv?: number;
    termMonths?: number;
    insuranceCover?: number;
    dataType?: ExtractedContractValues['dataType'];
    liabilityCap?: number;
  };
  diagnostics?: {
    missingFields: string[];
    lastPayloadShape?: string[];
    hydrationWarnings: string[];
  };
};

type Action =
  | { type: 'reset' }
  | { type: 'uploadStarted'; file: { name: string; type: string } }
  | { type: 'extractionHydrated'; payload: ExtractionPayload }
  | { type: 'analysisStarted' }
  | { type: 'analysisHydrated'; analysis: AnalysisPayload }
  | { type: 'analysisFailed'; error: string }
  | { type: 'setError'; error: string }
  | { type: 'setLiabilityCap'; value: number | null };

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

const STORAGE_KEY = 'pactora.documentAnalysis.v1';

const emptySteps: DocumentAnalysisState['processingSteps'] = {
  upload: false,
  extraction: false,
  clauseDetection: false,
  riskAnalysis: false,
  recommendations: false,
};

export const emptyDocumentAnalysisState: DocumentAnalysisState = {
  documentId: '',
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
  commercialContext: {},
  diagnostics: {
    missingFields: [],
    hydrationWarnings: [],
  },
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
    text: flag.problematicLanguage,
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

function reducer(state: DocumentAnalysisState, action: Action): DocumentAnalysisState {
  let next = state;

  switch (action.type) {
    case 'reset':
      next = emptyDocumentAnalysisState;
      break;
    case 'uploadStarted':
      next = {
        ...emptyDocumentAnalysisState,
        documentId: stableDocumentId(action.file.name),
        uploadStatus: 'uploading',
        documentMeta: {
          fileName: action.file.name,
          fileType: action.file.type,
          uploadedAt: new Date().toISOString(),
        },
        processingSteps: { ...emptySteps, upload: true },
      };
      break;
    case 'extractionHydrated': {
      const detected = action.payload.detectedValues;
      next = {
        ...state,
        documentId: action.payload.documentId ?? state.documentId ?? stableDocumentId(action.payload.documentMeta?.fileName),
        uploadStatus: 'processing',
        documentMeta: { ...state.documentMeta, ...action.payload.documentMeta },
        extractedParties: { ...state.extractedParties, ...action.payload.extractedParties },
        extractedTerms: { ...state.extractedTerms, ...action.payload.extractedTerms },
        summary: action.payload.summary ?? state.summary,
        rawText: action.payload.contractText ?? state.rawText,
        commercialContext: {
          ...state.commercialContext,
          acv: detected?.acv ?? state.commercialContext?.acv,
          termMonths: detected?.termMonths ?? state.commercialContext?.termMonths,
          insuranceCover: detected?.insuranceCover ?? state.commercialContext?.insuranceCover,
          dataType: detected?.dataType ?? state.commercialContext?.dataType,
        },
        processingSteps: { ...state.processingSteps, upload: true, extraction: true },
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
          liabilityCap: action.value ?? undefined,
        },
      };
      break;
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

function readStoredState() {
  if (typeof window === 'undefined') return emptyDocumentAnalysisState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDocumentAnalysisState;
    return { ...emptyDocumentAnalysisState, ...(JSON.parse(raw) as DocumentAnalysisState) };
  } catch {
    console.warn('[PACTORA] Hydration mismatch: stored document analysis state could not be parsed');
    return emptyDocumentAnalysisState;
  }
}

type StoreValue = {
  state: DocumentAnalysisState;
  actions: {
    reset: () => void;
    uploadStarted: (file: Pick<File, 'name' | 'type'>) => void;
    hydrateExtraction: (payload: ExtractionPayload) => void;
    analysisStarted: () => void;
    hydrateAnalysis: (analysis: AnalysisPayload) => void;
    analysisFailed: (error: string) => void;
    setError: (error: string) => void;
    setLiabilityCap: (value: number | null) => void;
  };
};

const DocumentAnalysisContext = createContext<StoreValue | null>(null);

export function DocumentAnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, emptyDocumentAnalysisState, readStoredState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const actions = useMemo<StoreValue['actions']>(() => ({
    reset: () => dispatch({ type: 'reset' }),
    uploadStarted: (file) => dispatch({ type: 'uploadStarted', file: { name: file.name, type: file.type } }),
    hydrateExtraction: (payload) => dispatch({ type: 'extractionHydrated', payload }),
    analysisStarted: () => dispatch({ type: 'analysisStarted' }),
    hydrateAnalysis: (analysis) => dispatch({ type: 'analysisHydrated', analysis }),
    analysisFailed: (error) => dispatch({ type: 'analysisFailed', error }),
    setError: (error) => dispatch({ type: 'setError', error }),
    setLiabilityCap: (value) => dispatch({ type: 'setLiabilityCap', value }),
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
  return useDocumentAnalysis().commercialContext ?? {};
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
