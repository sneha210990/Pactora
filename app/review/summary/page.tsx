'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { LEGAL_DISCLAIMER } from '@/lib/constants';
import { EmailCaptureBanner } from '@/components/email-capture-banner';
import { FeedbackForm } from '@/components/feedback-form';
import { trackEvent } from '@/components/track-event';
import type { ClauseFlag } from '@/lib/clause-analysis';
import type { CrossClauseRisk } from '@/lib/agents/cross-clause-engine';
import { useDocumentAnalysis, useDocumentAnalysisActions, extractedValue } from '@/lib/document-analysis-store';
import { ActiveDocumentBanner, formatOptionalMoneyField, formatOptionalMonthsField, formatOptionalTextField } from '../components/active-document-banner';
import { NewReviewButton } from '../components/new-review-button';
import { NegotiationLadder } from '../components/negotiation-ladder';
import { ReviewProgress } from '../components/review-progress';
import { ExportPdfButton } from '@/components/export-pdf-button';
import { ClauseDiff } from '../components/clause-diff';
import { DownloadRedlineButton } from '@/components/download-redline-button';
import { Tooltip } from '@/components/tooltip';
import { ChatPanel } from '../components/chat-panel';

type RiskLevel = 'Low' | 'Medium' | 'High';

type ReviewSection = {
  key: string;
  label: string;
  href: string;
  param: string;
  description: string;
};

const reviewSections: ReviewSection[] = [
  {
    key: 'lol',
    label: 'Liability cap',
    href: '/review/lol',
    param: 'lolRisk',
    description: 'Confirm the liability cap is proportionate to deal value and expected exposure.',
  },
  {
    key: 'indemnities',
    label: 'Indemnities',
    href: '/review/indemnities',
    param: 'indemnitiesRisk',
    description: 'Prioritise broad, one-sided, or uncapped indemnity obligations.',
  },
  {
    key: 'ip',
    label: 'IP ownership',
    href: '/review/ip',
    param: 'ipRisk',
    description: 'Protect pre-existing IP and narrow broad ownership or licence transfers.',
  },
  {
    key: 'data',
    label: 'Data protection',
    href: '/review/data',
    param: 'dataRisk',
    description: 'Check GDPR, security, sub-processor, and data-cap interactions.',
  },
  {
    key: 'termination',
    label: 'Termination',
    href: '/review/termination',
    param: 'terminationRisk',
    description: 'Tighten one-sided termination rights, short notice, and missing cure periods.',
  },
];

function money(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}


function riskScore(risk: RiskLevel) {
  if (risk === 'High') return 3;
  if (risk === 'Medium') return 2;
  return 1;
}

function riskClass(risk: RiskLevel) {
  if (risk === 'High') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (risk === 'Medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
}

function deriveLolRisk(lolCap: number | null, acvAmount: number | null): RiskLevel | null {
  if (lolCap === null || lolCap <= 0 || acvAmount === null || acvAmount <= 0) return null;

  const ratio = lolCap / acvAmount;
  if (ratio < 1) return 'High';
  if (ratio <= 2) return 'Medium';
  return 'Low';
}

function describeOverall(overallRisk: RiskLevel, knownRiskCount: number, capRatio: number | null) {
  if (knownRiskCount === 0) return 'Run each section review to build a complete composite risk score.';

  const ratioText = capRatio !== null ? ` Liability cap is ${capRatio.toFixed(2)}× ACV.` : '';
  if (overallRisk === 'High') return `At least one core review area needs attention before signature.${ratioText}`;
  if (overallRisk === 'Medium') return `Most issues look negotiable, but there are still points to tighten.${ratioText}`;
  return `Current inputs indicate a comparatively low-risk position across reviewed areas.${ratioText}`;
}

const MAX_CLAUSE_AGENTS = 8;

function computeRiskScore(flags: ClauseFlag[]): number {
  if (flags.length === 0) return 0;
  const weighted = flags.reduce((sum, f) => sum + riskScore(f.riskLevel), 0);
  return Math.round((weighted / (MAX_CLAUSE_AGENTS * 3)) * 100);
}

function scoreColorClass(score: number): string {
  if (score >= 60) return 'text-red-300';
  if (score >= 30) return 'text-amber-300';
  return 'text-emerald-300';
}

function scoreBorderClass(score: number): string {
  if (score >= 60) return 'border-red-500/30 bg-red-500/5';
  if (score >= 30) return 'border-amber-500/30 bg-amber-500/5';
  return 'border-emerald-500/30 bg-emerald-500/5';
}

type Verdict = {
  text: string;
  detail: string;
  colorClass: string;
};

function shouldSignVerdict(score: number, highCount: number): Verdict {
  if (highCount >= 2 || score >= 60) {
    return {
      text: 'Not ready to sign',
      detail: `${highCount} high-risk clause${highCount !== 1 ? 's' : ''} need resolution. Use the flags below to prioritise.`,
      colorClass: 'text-red-300',
    };
  }
  if (highCount === 1 || score >= 30) {
    return {
      text: 'Sign with conditions',
      detail: 'One issue needs negotiation. Suggested redlines are ready below.',
      colorClass: 'text-amber-300',
    };
  }
  return {
    text: 'Ready to sign',
    detail: 'No critical blockers found. All reviewed clauses are within acceptable range.',
    colorClass: 'text-emerald-300',
  };
}

function clauseFlagRiskClass(risk: ClauseFlag['riskLevel']) {
  if (risk === 'High') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (risk === 'Medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
}

const PLAYBOOK_CLAUSE_TYPES = new Set(['Liability Cap', 'Indemnities', 'IP Ownership', 'Data Protection', 'Termination']);

function ClauseFlagCard({
  flag, acv, liabilityCap, contractSide, onAccept, isAccepted, onDismiss,
}: {
  flag: ClauseFlag;
  acv?: number | null;
  liabilityCap?: number | null;
  contractSide?: 'supplier' | 'buyer' | null;
  onAccept?: (clauseText: string, proposedText: string, explanation: string) => void;
  isAccepted?: boolean;
  onDismiss?: () => void;
}) {
  const showPlaybook = PLAYBOOK_CLAUSE_TYPES.has(flag.clauseType);
  const [isExpanded, setIsExpanded] = useState(flag.riskLevel === 'High');
  const [alternative, setAlternative] = useState('');
  const [altLoading, setAltLoading] = useState(false);
  const [altError, setAltError] = useState('');

  async function suggestAlternative() {
    setAltLoading(true);
    setAltError('');
    try {
      const res = await apiFetch('/api/contracts/redline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clauseText: flag.clauseText ?? flag.problematicLanguage ?? '',
          clauseType: flag.clauseType,
          acv: acv ?? null,
          liabilityCap: liabilityCap ?? null,
          contractSide: contractSide ?? null,
        }),
      });
      const data = (await res.json()) as { alternative?: string; error?: string };
      if (!res.ok || !data.alternative) {
        setAltError(data.error ?? 'Could not generate alternative. Try again.');
      } else {
        setAlternative(data.alternative);
      }
    } catch {
      setAltError('Network error. Please try again.');
    } finally {
      setAltLoading(false);
    }
  }

  const ladderItems = flag.negotiationPositions
    ? [
        { label: 'Ask',      title: flag.negotiationPositions.ask.title,      script: flag.negotiationPositions.ask.script },
        { label: 'Fallback', title: flag.negotiationPositions.fallback.title,  script: flag.negotiationPositions.fallback.script },
        { label: 'Narrowing', title: flag.negotiationPositions.narrowing.title, script: flag.negotiationPositions.narrowing.script },
      ]
    : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-zinc-200 truncate">{flag.clauseType}</span>
          {flag.pageNumber != null && (
            <span className="shrink-0 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400">
              p.{flag.pageNumber}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${clauseFlagRiskClass(flag.riskLevel)}`}>
            {flag.riskLevel}
          </span>
          {flag.confidence === 'Uncertain' && (
            <Tooltip content="AI confidence in this flag is low — verify manually before relying on it." position="bottom">
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                Uncertain
              </span>
            </Tooltip>
          )}
          <svg
            className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16" fill="none" aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800 px-5 pb-5 pt-4">
          {flag.verified === false && flag.verificationNote && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <span className="font-semibold">Unverified:</span> {flag.verificationNote}
            </div>
          )}

          {flag.clauseText && (
            <div className="mb-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold text-zinc-500">Extracted clause</p>
              <p className="whitespace-pre-wrap font-mono text-xs text-zinc-300">{flag.clauseText}</p>
            </div>
          )}

          {flag.problematicLanguage && (
            <blockquote className="mb-3 border-l-2 border-zinc-600 pl-3">
              <p className="text-xs italic text-zinc-400">&ldquo;{flag.problematicLanguage}&rdquo;</p>
            </blockquote>
          )}

          <p className="text-sm text-zinc-300">{flag.plainEnglish}</p>

          {ladderItems ? (
            <NegotiationLadder title="Negotiation positions" items={ladderItems} className="mt-4" />
          ) : (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold text-zinc-500">Negotiation point</p>
              <p className="text-xs text-zinc-300">{flag.negotiationPoint}</p>
            </div>
          )}

          {showPlaybook && (
            <div className="mt-3">
              {alternative ? (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold text-emerald-400">Alternative language</p>
                    <div className="flex items-center gap-2">
                      {isAccepted ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Accepted
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const proposedText = alternative.replace(/\nWhy this works:[\s\S]*/i, '').trim();
                            const explanation = alternative.match(/\nWhy this works:([\s\S]*)/i)?.[0]?.replace(/^\n/, '').trim() ?? '';
                            onAccept?.(flag.clauseText ?? flag.problematicLanguage ?? '', proposedText, explanation);
                          }}
                          className="flex items-center gap-1 rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-300 hover:border-emerald-500 hover:text-emerald-100"
                        >
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Accept redline
                        </button>
                      )}
                      <button type="button" onClick={() => { setAlternative(''); onDismiss?.(); }} className="text-[10px] text-zinc-500 hover:text-zinc-300">
                        {isAccepted ? 'Undo' : 'Dismiss'}
                      </button>
                    </div>
                  </div>
                  <ClauseDiff
                    original={flag.clauseText ?? flag.problematicLanguage ?? ''}
                    proposed={alternative.replace(/\nWhy this works:[\s\S]*/i, '').trim()}
                    explanation={(() => {
                      const m = alternative.match(/\nWhy this works:([\s\S]*)/i);
                      return m ? m[0].replace(/^\n/, '').trim() : '';
                    })()}
                  />
                  <button
                    type="button"
                    onClick={suggestAlternative}
                    disabled={altLoading}
                    className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                  >
                    {altLoading ? 'Regenerating…' : 'Regenerate'}
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={suggestAlternative}
                    disabled={altLoading}
                    className="flex items-center gap-1.5 rounded border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-400 hover:text-zinc-100 disabled:opacity-50"
                  >
                    {altLoading ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border border-zinc-600 border-t-zinc-300" />
                        Drafting redline…
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        Get suggested wording
                      </>
                    )}
                  </button>
                  {altError && <p className="mt-1 text-xs text-red-400">{altError}</p>}
                </div>
              )}
            </div>
          )}

          {flag.highlightRange != null && flag.pageNumber != null && (
            <button
              type="button"
              className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-300"
              onClick={() => {
                console.log(
                  `Highlight in PDF: page ${flag.pageNumber}, chars ${flag.highlightRange!.start}-${flag.highlightRange!.end}`,
                );
              }}
            >
              Open in PDF (page {flag.pageNumber})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function crossClauseRiskClass(risk: CrossClauseRisk['riskLevel']) {
  if (risk === 'High') return 'border-red-500/40 bg-red-500/10';
  if (risk === 'Medium') return 'border-amber-500/40 bg-amber-500/10';
  return 'border-emerald-500/40 bg-emerald-500/10';
}

function crossClauseRiskBadgeClass(risk: CrossClauseRisk['riskLevel']) {
  if (risk === 'High') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (risk === 'Medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
}

function CrossClauseRiskCard({ risk }: { risk: CrossClauseRisk }) {
  return (
    <div className={`rounded-xl border p-5 ${crossClauseRiskClass(risk.riskLevel)}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            {risk.primaryClause} ↔ {risk.relatedClause}
          </p>
          <p className="mt-1 text-sm font-semibold text-zinc-100">{risk.headline}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${crossClauseRiskBadgeClass(risk.riskLevel)}`}>
          {risk.riskLevel}
        </span>
      </div>
      <p className="text-sm text-zinc-300">{risk.plainEnglish}</p>
      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Negotiation point</p>
        <p className="text-xs text-zinc-300">{risk.negotiationPoint}</p>
      </div>
    </div>
  );
}

function FeedbackToggle({ user }: { user: { email: string } | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-10">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
        >
          Share feedback on this summary
        </button>
      ) : (
        <section className="rounded-2xl border border-zinc-900 bg-black/20 p-4 opacity-90">
          <div className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-400">Beta feedback</h2>
              <p className="mt-1 text-xs text-zinc-500">Optional — share what would make this summary more useful.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ✕ Close
            </button>
          </div>
          <FeedbackForm user={user} compact />
        </section>
      )}
    </div>
  );
}

function SummaryContent() {
  const analysis = useDocumentAnalysis();
  const actions = useDocumentAnalysisActions();

  const acceptedRedlines = analysis.acceptedRedlines ?? {};
  const sourceFileType = analysis.sourceFileType ?? null;
  const docxStorageKey = analysis.docxStorageKey ?? null;
  const contractSide = analysis.contractSide ?? null;

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [emailContent, setEmailContent] = useState('');
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchError, setBatchError] = useState('');

  useEffect(() => {
    trackEvent('analysis_completed', '/review/summary');
    fetch('/api/me')
      .then((response) => response.json())
      .then((data: { user: { email: string } | null }) => setUser(data.user));
  }, []);


  const commercialContext = analysis.commercialContext;
  const acvAmount = commercialContext.acv.value;
  const dataType = commercialContext.dataType;
  const lolCap = commercialContext.liabilityCap;
  const capRatio = lolCap !== null && acvAmount !== null && acvAmount > 0 ? lolCap / acvAmount : null;
  const inferredLolRisk = deriveLolRisk(lolCap, acvAmount);
  const clauseFlags: ClauseFlag[] = analysis.clauses.map((clause) => ({
    clauseType: clause.type,
    riskLevel: clause.riskLevel ?? 'Low',
    problematicLanguage: clause.text ?? '',
    plainEnglish: clause.explanation ?? 'Analysis incomplete',
    negotiationPoint: analysis.recommendations.find((recommendation) => recommendation.clauseType === clause.type)?.text ?? 'No recommendation generated',
    negotiationPositions: clause.negotiationPositions,
    confidence: clause.confidence,
  }));

  const effectiveFlags: ClauseFlag[] = clauseFlags.length > 0 ? clauseFlags : (analysis.manualFlags ?? []);
  const uncertainFlagCount = effectiveFlags.filter((f) => f.confidence === 'Uncertain').length;

  const playbookFlags = effectiveFlags.filter(
    (f) => PLAYBOOK_CLAUSE_TYPES.has(f.clauseType) && !!(f.clauseText || f.problematicLanguage),
  );

  const rankedSections = useMemo(() => {
    return reviewSections
      .map((section) => {
        const canonicalRisk = analysis.risks.find((risk) => risk.clauseType.toLowerCase().includes(section.label.toLowerCase().split(' ')[0]));
        const risk = section.key === 'lol' ? inferredLolRisk ?? canonicalRisk?.level ?? null : canonicalRisk?.level ?? null;
        return {
          ...section,
          risk,
          score: risk ? riskScore(risk) : 0,
          hrefWithParams: section.href,
        };
      })
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }, [analysis.risks, inferredLolRisk]);

  const knownRisks = rankedSections.filter((section) => section.risk !== null) as Array<(typeof rankedSections)[number] & { risk: RiskLevel }>;
  const sectionRisks = Object.fromEntries(knownRisks.map((s) => [s.key, s.risk]));
  const averageRisk = knownRisks.length > 0 ? knownRisks.reduce((sum, section) => sum + riskScore(section.risk), 0) / knownRisks.length : 0;
  const overallRisk: RiskLevel = knownRisks.some((section) => section.risk === 'High') || averageRisk >= 2.4 ? 'High' : averageRisk >= 1.7 ? 'Medium' : 'Low';

  const crossClauseRisks: CrossClauseRisk[] = analysis.crossClauseRisks ?? [];

  const riskScore100 = computeRiskScore(clauseFlags);
  const highFlags = clauseFlags.filter((f) => f.riskLevel === 'High');
  const verdict = shouldSignVerdict(riskScore100, highFlags.length);

  async function generateEmail() {
    if (effectiveFlags.length === 0) return;
    setEmailGenerating(true);
    setEmailError('');
    setEmailCopied(false);

    try {
      const response = await apiFetch('/api/contracts/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags: effectiveFlags, commercialContext: analysis.commercialContext }),
      });
      const data = (await response.json()) as { email?: string; error?: string };
      if (!response.ok || !data.email) {
        setEmailError(data.error ?? 'Could not generate email. Please try again.');
      } else {
        setEmailContent(data.email);
        trackEvent('negotiation_email_generated', '/review/summary');
      }
    } catch {
      setEmailError('Network error. Please try again.');
    } finally {
      setEmailGenerating(false);
    }
  }

  async function copyEmail() {
    await navigator.clipboard.writeText(emailContent);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2000);
  }

  async function generateAllRedlines() {
    if (playbookFlags.length === 0 || batchGenerating) return;
    setBatchGenerating(true);
    setBatchError('');
    try {
      const results = await Promise.allSettled(
        playbookFlags.map((flag) =>
          apiFetch('/api/contracts/redline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clauseText: flag.clauseText ?? flag.problematicLanguage ?? '',
              clauseType: flag.clauseType,
              acv: acvAmount ?? null,
              liabilityCap: lolCap ?? null,
              contractSide: contractSide ?? null,
            }),
          }).then((res) => res.json() as Promise<{ alternative?: string; error?: string }>),
        ),
      );
      let successCount = 0;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const flag = playbookFlags[i];
        if (result.status === 'fulfilled' && result.value.alternative) {
          const alt = result.value.alternative;
          const proposedText = alt.replace(/\nWhy this works:[\s\S]*/i, '').trim();
          const explanation = alt.match(/\nWhy this works:([\s\S]*)/i)?.[0]?.replace(/^\n/, '').trim() ?? '';
          actions.acceptRedline(
            flag.clauseType,
            flag.clauseText ?? flag.problematicLanguage ?? '',
            proposedText,
            explanation,
          );
          successCount++;
        }
      }
      if (successCount === 0) {
        setBatchError('Could not generate redlines. Please try again.');
      }
    } catch {
      setBatchError('Network error. Please try again.');
    } finally {
      setBatchGenerating(false);
    }
  }

  if (!analysis.activeDocument) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <div className="mt-32 flex flex-col items-center text-center">
            <div className="rounded-full border border-zinc-800 bg-zinc-900 p-4">
              <svg className="h-8 w-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-semibold text-zinc-200">No contract analysed yet</h1>
            <p className="mt-2 max-w-sm text-sm text-zinc-400">
              Your summary will appear here after you upload a contract and run the AI analysis.
            </p>
            <Link
              href="/deals/new"
              className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              Upload a contract →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <div className="flex items-center gap-2">
            <DownloadRedlineButton
              acceptedRedlines={acceptedRedlines}
              sourceFileType={sourceFileType}
              fileName={analysis.documentMeta?.fileName ?? 'contract'}
              docxStorageKey={docxStorageKey}
            />
            <ExportPdfButton
              contractName={analysis.documentMeta?.fileName ?? ''}
              commercialContext={commercialContext}
              overallRisk={overallRisk}
              verdict={verdict.text}
              riskScore={riskScore100}
              flags={effectiveFlags}
              crossClauseRisks={crossClauseRisks}
            />
            <NewReviewButton className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900" />
          </div>
        </div>

        {contractSide && (
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
              Reviewing as:{' '}
              <span className="font-semibold text-zinc-200">
                {contractSide === 'supplier' ? 'Supplier / Service provider' : 'Client / Buyer'}
              </span>
            </span>
          </div>
        )}

        <section className={`mt-4 rounded-2xl border p-6 ${clauseFlags.length > 0 ? scoreBorderClass(riskScore100) : 'border-zinc-800 bg-zinc-950/50'}`}>
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Should I sign?</p>
              <p className={`mt-2 text-3xl font-bold ${clauseFlags.length > 0 ? verdict.colorClass : 'text-zinc-400'}`}>
                {clauseFlags.length > 0 ? verdict.text : 'Insufficient data'}
              </p>
              <p className="mt-2 text-sm text-zinc-300">
                {clauseFlags.length > 0 ? verdict.detail : 'Upload a contract and run AI analysis to generate a verdict.'}
              </p>
            </div>
            {clauseFlags.length > 0 && (
              <div className="shrink-0 text-right">
                <Tooltip content="Weighted risk score across all flagged clauses — 0 = no risk, 100 = maximum risk." position="bottom">
                  <span className={`text-7xl font-bold tabular-nums leading-none ${scoreColorClass(riskScore100)}`}>{riskScore100}</span>
                </Tooltip>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">/ 100</p>
              </div>
            )}
          </div>
        </section>

        <p className="mt-2 text-xs text-zinc-600">Pactora identifies risks for review — not legal advice and does not replace a solicitor.</p>

        {clauseFlags.length > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-2.5 text-xs text-zinc-400">
            <svg className="h-3.5 w-3.5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Your analysis is saved in this browser — return anytime to pick up where you left off.
          </div>
        )}

        <ReviewProgress current="summary" sectionRisks={sectionRisks} />
        <ActiveDocumentBanner />

        <div className="mt-6">
          <div className="flex flex-wrap gap-2">
            {extractedValue(commercialContext.acv) !== null && (
              <Tooltip content="Annual Contract Value — the total revenue from this contract in one year.">
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Deal value: {formatOptionalMoneyField(commercialContext.acv)}</span>
              </Tooltip>
            )}
            {extractedValue(commercialContext.termMonths) !== null && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Term: {formatOptionalMonthsField(commercialContext.termMonths)}</span>
            )}
            {extractedValue(commercialContext.insuranceCover) !== null && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Insurance: {formatOptionalMoneyField(commercialContext.insuranceCover)}</span>
            )}
            {extractedValue(dataType) !== null && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Data: {formatOptionalTextField(dataType)}</span>
            )}
            {lolCap !== null && lolCap > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Liability cap: {money(lolCap)}</span>
            )}
          </div>

          <nav className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3" aria-label="Review sections">
            <div className="mb-2 text-xs font-semibold tracking-wide text-zinc-500">Review sections</div>
            <div className="flex flex-wrap gap-2">
              {reviewSections.map((section) => (
                <Link
                  key={section.key}
                  href={section.href}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
                >
                  {section.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        <section className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
          {emailContent ? (
            <>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-blue-200">Negotiation email</h2>
                <div className="flex gap-2">
                  <button onClick={copyEmail} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800">
                    {emailCopied ? 'Copied!' : 'Copy to clipboard'}
                  </button>
                  <button
                    onClick={generateEmail}
                    disabled={emailGenerating}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {emailGenerating ? 'Generating…' : 'Regenerate'}
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={emailContent}
                rows={8}
                className="w-full rounded-lg border border-zinc-700 bg-black/40 px-3 py-2 text-xs leading-relaxed text-zinc-200"
              />
            </>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-blue-200">Prepare for negotiation</h2>
                <p className="mt-1 text-sm text-zinc-300">Generate a ready-to-send email covering all flagged issues, prioritised by risk.</p>
              </div>
              <div className="shrink-0">
                <button
                  onClick={generateEmail}
                  disabled={emailGenerating || effectiveFlags.length === 0}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:bg-zinc-700 disabled:text-zinc-300"
                >
                  {emailGenerating ? 'Generating…' : effectiveFlags.length === 0 ? 'No flags to include' : 'Generate negotiation email'}
                </button>
                {emailError ? <p className="mt-1 text-xs text-red-300">{emailError}</p> : null}
                {!emailGenerating && effectiveFlags.length === 0 && (
                  <p className="mt-1 text-xs text-zinc-500">Run the review sections above to generate clause flags first.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-400">Overall risk</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${riskClass(overallRisk)}`}>{overallRisk}</span>
              <span className="text-xs text-zinc-500">{knownRisks.length}/5 sections rated</span>
            </div>
            <p className="mt-3 text-sm text-zinc-300">{describeOverall(overallRisk, knownRisks.length, capRatio)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-400">Key negotiation priorities</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {rankedSections.map((section, index) => (
                <li key={section.key}>
                  <Link href={section.hrefWithParams} className="block rounded-lg border border-zinc-800 bg-black/25 px-3 py-2 hover:border-zinc-600">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-zinc-200">{index < 3 && section.risk ? `${index + 1}. ` : ''}{section.label}</span>
                      {section.risk ? (
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskClass(section.risk)}`}>{section.risk}</span>
                      ) : (
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">Review now →</span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">{section.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {crossClauseRisks.length > 0 && (
          <section className="mt-8">
            <div className="mb-1 flex items-center gap-3">
              <Tooltip content="Where two or more clauses interact to create combined exposure not obvious when reviewing each clause in isolation." position="bottom">
                <h2 className="text-sm font-semibold text-zinc-400">Cross-clause risks</h2>
              </Tooltip>
              <span className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 text-xs text-orange-300">
                {crossClauseRisks.length} interaction{crossClauseRisks.length !== 1 ? 's' : ''} detected
              </span>
            </div>
            <p className="mb-4 text-xs text-zinc-500">Where two clauses interact to create a combined exposure — often missed in clause-by-clause review.</p>
            <div className="flex flex-col gap-4">
              {crossClauseRisks.map((risk) => (
                <CrossClauseRiskCard key={risk.id} risk={risk} />
              ))}
            </div>
          </section>
        )}

        {effectiveFlags.length > 0 ? (
          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-sm font-semibold text-zinc-400">
                {clauseFlags.length > 0 ? 'Clause analysis' : 'Manual review findings'}
              </h2>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-300">
                {effectiveFlags.length} {effectiveFlags.length === 1 ? 'flag' : 'flags'}
              </span>
              {sourceFileType === 'docx' && playbookFlags.length > 0 && (
                <div className="ml-auto flex flex-col items-end gap-1">
                  <Tooltip content="Drafts proposed replacement language for all flagged clauses simultaneously and accepts them. Then click Download redline to export the full Word document." position="bottom">
                  <button
                    type="button"
                    onClick={generateAllRedlines}
                    disabled={batchGenerating}
                    className="flex items-center gap-1.5 rounded border border-emerald-700/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:border-emerald-500 hover:text-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {batchGenerating ? (
                      <>
                        <div className="h-3 w-3 animate-spin rounded-full border border-emerald-700 border-t-emerald-300" />
                        Generating redlines…
                      </>
                    ) : (
                      <>
                        <svg className="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        Generate all redlines
                      </>
                    )}
                  </button>
                  </Tooltip>
                  {batchError && <p className="text-[11px] text-red-400">{batchError}</p>}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-6">
              {uncertainFlagCount >= 2 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  <span className="font-semibold">Human review recommended — </span>
                  {uncertainFlagCount} of these flags have uncertain confidence. Verify with a qualified legal or commercial reviewer before relying on this analysis.
                </div>
              )}
              {(['High', 'Medium', 'Low'] as const).map((level) => {
                const levelFlags = effectiveFlags.filter((f) => f.riskLevel === level);
                if (levelFlags.length === 0) return null;
                return (
                  <div key={level} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${level === 'High' ? 'text-red-400' : level === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {level} risk
                      </span>
                      <div className={`flex-1 border-t ${level === 'High' ? 'border-red-500/20' : level === 'Medium' ? 'border-amber-500/20' : 'border-emerald-500/20'}`} />
                      <span className="text-xs text-zinc-600">{levelFlags.length}</span>
                    </div>
                    {levelFlags.map((flag) => (
                      <ClauseFlagCard
                        key={flag.clauseType}
                        flag={flag}
                        acv={acvAmount}
                        liabilityCap={lolCap}
                        contractSide={contractSide}
                        onAccept={(clauseText, proposedText, explanation) =>
                          actions.acceptRedline(flag.clauseType, clauseText, proposedText, explanation)
                        }
                        isAccepted={!!acceptedRedlines[flag.clauseType]}
                        onDismiss={() => actions.dismissRedline(flag.clauseType)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Clause Analysis</h2>
            <p className="mt-2 text-sm text-zinc-500">No flags detected — upload a new contract to run AI analysis.</p>
          </section>
        )}

        {user === null && clauseFlags.length > 0 && (
          <EmailCaptureBanner
            analysisPayload={{
              riskScore: riskScore100,
              verdict: verdict.text,
              verdictDetail: verdict.detail,
              flags: effectiveFlags.map((f) => ({
                clauseType: f.clauseType,
                riskLevel: f.riskLevel,
                plainEnglish: f.plainEnglish,
                negotiationPoint: f.negotiationPoint,
                pageNumber: f.pageNumber ?? null,
              })),
            }}
          />
        )}

        <div className="mt-8">
          <ExportPdfButton
            contractName={analysis.documentMeta?.fileName ?? ''}
            commercialContext={commercialContext}
            overallRisk={overallRisk}
            verdict={verdict.text}
            riskScore={riskScore100}
            flags={effectiveFlags}
            crossClauseRisks={crossClauseRisks}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">{LEGAL_DISCLAIMER}</p>

        <div className="mt-3 text-center">
          <Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            Back to home
          </Link>
        </div>

        <FeedbackToggle user={user} />
      </div>

      {/* Floating chat panel */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {chatOpen && (
          <div className="w-[420px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
            <ChatPanel contractText={analysis.rawText ?? ''} onClose={() => setChatOpen(false)} />
          </div>
        )}
        <button
          type="button"
          onClick={() => setChatOpen((o) => !o)}
          aria-label={chatOpen ? 'Close chat' : 'Ask about this contract'}
          className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800 px-4 py-2.5 shadow-lg shadow-black/40 transition-colors hover:bg-zinc-700"
        >
          {chatOpen ? (
            <svg className="h-4 w-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
          <span className="text-sm font-medium text-zinc-200">{chatOpen ? 'Close' : 'Ask a question'}</span>
        </button>
      </div>
    </main>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-6 text-white">Loading summary…</main>}>
      <SummaryContent />
    </Suspense>
  );
}
