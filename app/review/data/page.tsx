'use client';

import Link from 'next/link';
import { Suspense, useRef, useState } from 'react';
import { NegotiationLadder } from '../components/negotiation-ladder';
import { RedlineSuggestion } from '../components/redline-suggestion';
import { ActiveDocumentBanner, formatOptionalMoneyField, formatOptionalMonthsField, formatOptionalTextField } from '../components/active-document-banner';
import { NewReviewButton } from '../components/new-review-button';
import { ReviewProgress } from '../components/review-progress';
import type { ClauseFlag } from '@/lib/document-analysis-store';
import { useClauseByType, useDocumentAnalysisActions, useDocumentCommercialContext } from '@/lib/document-analysis-store';
import { LEGAL_DISCLAIMER } from '@/lib/constants';

type DataRole = 'Controller' | 'Processor' | 'Joint' | 'Unknown';
type NotificationWindow = '24h' | '48h' | '72h' | 'Unknown';
type SubProcessorRisk = 'Low' | 'Medium' | 'High';
type CapInteraction = 'Outside cap' | 'Inside cap' | 'Unclear';
type SecurityScope = 'Reasonable' | 'Broad' | 'Unclear';
type RiskRating = 'Low' | 'Medium' | 'High';

type ReviewResult = {
  dataRole: DataRole;
  notificationWindow: NotificationWindow;
  subProcessorRisk: SubProcessorRisk;
  capInteraction: CapInteraction;
  securityScope: SecurityScope;
  riskRating: RiskRating;
  redFlags: string[];
};


function normalize(input: string) {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

function money(n: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n);
}

function num(value: string | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDataRole(text: string): DataRole {
  if (text.includes('joint controller')) return 'Joint';
  if (text.includes('processor')) return 'Processor';
  if (text.includes('controller')) return 'Controller';
  return 'Unknown';
}

function parseNotificationWindow(text: string): NotificationWindow {
  if (text.includes('within 24 hours') || text.includes('24 hours')) return '24h';
  if (text.includes('within 48 hours') || text.includes('48 hours')) return '48h';
  if (
    text.includes('without undue delay and where feasible within 72 hours') ||
    text.includes('within 72 hours') ||
    text.includes('72 hours')
  ) {
    return '72h';
  }

  return 'Unknown';
}

function parseSubProcessorRisk(text: string): SubProcessorRisk {
  const hasUnlimitedStyle =
    text.includes('fully liable for sub-processors') || text.includes('responsible for acts and omissions of sub-processors');

  const hasLimitation = /subject to|limited to|within the liability cap|up to/.test(text);
  if (hasUnlimitedStyle && !hasLimitation) return 'High';

  if (/sub-processor(s)?/.test(text) && /(prior notice|prior written notice|approval|consent)/.test(text)) {
    return 'Medium';
  }

  if (
    /sub-processor(s)?/.test(text) &&
    /(reasonable controls|appropriate safeguards|industry standard|limited responsibility|commercially reasonable)/.test(text)
  ) {
    return 'Low';
  }

  return 'Medium';
}

function parseCapInteraction(text: string): CapInteraction {
  if (
    text.includes('not subject to the liability cap') ||
    text.includes('cap shall not apply') ||
    text.includes('outside the limitation of liability') ||
    text.includes('unlimited liability for data protection')
  ) {
    return 'Outside cap';
  }

  if (text.includes('subject to the limitations of liability') || text.includes('within the liability cap')) {
    return 'Inside cap';
  }

  return 'Unclear';
}

function parseSecurityScope(text: string): SecurityScope {
  if (
    text.includes('industry standard security measures') ||
    text.includes('reasonable technical and organisational measures')
  ) {
    return 'Reasonable';
  }

  if (
    text.includes('best possible security') ||
    text.includes('all necessary security') ||
    text.includes('absolute security')
  ) {
    return 'Broad';
  }

  return 'Unclear';
}

function deriveRedFlags(
  notificationWindow: NotificationWindow,
  subProcessorRisk: SubProcessorRisk,
  capInteraction: CapInteraction,
  securityScope: SecurityScope,
): string[] {
  const flags: string[] = [];

  if (notificationWindow === '24h') {
    flags.push('Very short 24-hour breach notification window detected.');
  }

  if (subProcessorRisk === 'High') {
    flags.push('Broad sub-processor liability exposure detected.');
  }

  if (capInteraction === 'Outside cap') {
    flags.push('Data protection liability appears to sit outside the liability cap.');
  }

  if (securityScope === 'Broad') {
    flags.push('Security commitments appear broad or potentially unlimited.');
  }

  return flags;
}

function deriveRiskRating(
  notificationWindow: NotificationWindow,
  subProcessorRisk: SubProcessorRisk,
  capInteraction: CapInteraction,
  securityScope: SecurityScope,
): RiskRating {
  if (notificationWindow === '24h' || subProcessorRisk === 'High' || capInteraction === 'Outside cap') {
    return 'High';
  }

  if (securityScope === 'Broad' || securityScope === 'Unclear' || notificationWindow === 'Unknown' || capInteraction === 'Unclear') {
    return 'Medium';
  }

  if (subProcessorRisk === 'Low' && capInteraction === 'Inside cap' && securityScope === 'Reasonable') {
    return 'Low';
  }

  return 'Medium';
}

function parseClause(clause: string): ReviewResult {
  const text = normalize(clause);
  const dataRole = parseDataRole(text);
  const notificationWindow = parseNotificationWindow(text);
  const subProcessorRisk = parseSubProcessorRisk(text);
  const capInteraction = parseCapInteraction(text);
  const securityScope = parseSecurityScope(text);
  const riskRating = deriveRiskRating(notificationWindow, subProcessorRisk, capInteraction, securityScope);
  const redFlags = deriveRedFlags(notificationWindow, subProcessorRisk, capInteraction, securityScope);

  return {
    dataRole,
    notificationWindow,
    subProcessorRisk,
    capInteraction,
    securityScope,
    riskRating,
    redFlags,
  };
}

function riskClass(risk: RiskRating) {
  if (risk === 'High') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (risk === 'Low') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

function ReviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/30 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-base font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function synthesizeDataFlag(clauseText: string, result: ReviewResult): ClauseFlag {
  const summary = `Data role: ${result.dataRole}. Notification window: ${result.notificationWindow}. Sub-processor risk: ${result.subProcessorRisk}. Cap interaction: ${result.capInteraction}. Security scope: ${result.securityScope}.`;
  const negotiation =
    result.capInteraction === 'Outside cap'
      ? 'Data protection liability must sit inside the agreed liability cap, except where law mandates otherwise. Remove language placing data breach claims outside the cap.'
      : result.notificationWindow === '24h'
        ? 'Request 72-hour breach notification aligned with GDPR Article 33. 24-hour windows create unrealistic operational obligations.'
        : result.subProcessorRisk === 'High'
          ? 'Sub-processor liability should be proportionate and tied to reasonable oversight controls, not open-ended strict liability.'
          : 'Ensure security obligations reference reasonable, industry-standard technical and organisational measures rather than absolute outcomes.';
  return {
    clauseType: 'Data Protection',
    riskLevel: result.riskRating,
    clauseText,
    problematicLanguage: result.redFlags.join(' ') || clauseText.slice(0, 200),
    plainEnglish: summary,
    negotiationPoint: negotiation,
  };
}

function DataProtectionReviewContent() {
  const commercialContext = useDocumentCommercialContext();
  const canonicalClause = useClauseByType('Data Protection');

  const dataType = commercialContext.dataType;
  const lolCapParam = commercialContext.liabilityCap ? String(commercialContext.liabilityCap) : null;

  const lolCap = num(lolCapParam);

  const actions = useDocumentAnalysisActions();
  const [clause, setClause] = useState(canonicalClause?.text ?? '');
  const [result, setResult] = useState<ReviewResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const queryString = '';

  function runReview() {
    const parsed = parseClause(clause);
    setResult(parsed);
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    if (clause.trim()) {
      actions.setManualReviewFlag(synthesizeDataFlag(clause, parsed));
    }
  }

  function reset() {
    setClause('');
    setResult(null);
  }

  const showWarning =
    result &&
    (result.notificationWindow === '24h' ||
      result.subProcessorRisk === 'High' ||
      result.capInteraction === 'Outside cap' ||
      result.securityScope === 'Broad');

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <NewReviewButton className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900" />
        </div>

        <ReviewProgress current="data" />
        <ActiveDocumentBanner />

        <section className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Data Protection Review</h1>
          <p className="mt-2 text-zinc-400">
            Assess whether GDPR, security, and data-processing obligations create disproportionate risk.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">ACV: {formatOptionalMoneyField(commercialContext.acv)}</span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Term: {formatOptionalMonthsField(commercialContext.termMonths)}</span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Insurance: {formatOptionalMoneyField(commercialContext.insuranceCover)}</span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Data: {formatOptionalTextField(dataType)}</span>
            {lolCap !== null && lolCap > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Liability cap: {money(lolCap)}</span>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Clause input</h2>
            <p className="text-xs text-zinc-400">
              Paste the DPA / GDPR / data-processing wording here to assess breach notification, sub-processor exposure, and
              liability carve-outs.
            </p>
          </div>
          <label htmlFor="dataClause" className="text-base font-semibold">
            Paste the data protection clause
          </label>
          <textarea
            id="dataClause"
            rows={8}
            value={clause}
            onChange={(event) => setClause(event.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-black/40 p-4 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-500 focus:border-zinc-500"
            placeholder="Paste data protection wording..."
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runReview}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
            >
              Run review
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Reset
            </button>
          </div>
        </section>

        {result && (
          <section ref={resultRef} className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <ReviewCard label="Data role" value={result.dataRole} />
              <ReviewCard label="Notification window" value={result.notificationWindow} />
              <ReviewCard label="Sub-processor risk" value={result.subProcessorRisk} />
              <div className={`rounded-xl border p-4 ${riskClass(result.riskRating)}`}>
                <div className="text-xs uppercase tracking-wide">Risk rating</div>
                <div className="mt-2 text-base font-semibold">{result.riskRating}</div>
              </div>
            </div>

            {showWarning && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                <div className="text-sm font-semibold">Data protection warning</div>
                <p className="mt-1 text-sm">
                  This clause may create GDPR or processor exposure beyond what most SaaS companies accept.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
              <h3 className="text-base font-semibold">Detected from your clause</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Data role</span>
                  <span className="font-medium">{result.dataRole}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Notification window</span>
                  <span className="font-medium">{result.notificationWindow}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Sub-processor risk</span>
                  <span className="font-medium">{result.subProcessorRisk}</span>
                </div>
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">Cap interaction</span>
                  <span className="font-medium">{result.capInteraction}</span>
                </div>
                <div>
                  <div className="mb-2 text-zinc-400">Extracted red flags</div>
                  {result.redFlags.length > 0 ? (
                    <ul className="space-y-2">
                      {result.redFlags.map((flag) => (
                        <li key={flag} className="rounded-lg border border-zinc-800 bg-black/30 p-3 text-zinc-200">
                          {flag}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-lg border border-zinc-800 bg-black/30 p-3 text-zinc-300">No clear red flags detected.</div>
                  )}
                </div>
              </div>
            </div>

            <NegotiationLadder
              title="Negotiation ladder"
              items={[
                {
                  label: 'Position 1',
                  title: 'Align notification windows with operational reality',
                  script:
                    '“We can commit to prompt notification, but breach notification timelines should reflect practical incident triage and customer comms.”',
                },
                {
                  label: 'Position 2',
                  title: 'Ensure sub-processor liability is proportionate',
                  script:
                    '“Sub-processor responsibility should be proportionate and tied to reasonable oversight, not open-ended strict liability.”',
                },
                {
                  label: 'Position 3',
                  title: 'Keep data liabilities within the liability cap where possible',
                  script:
                    '“Data protection liabilities should be addressed under the agreed liability framework unless law requires otherwise.”',
                },
                {
                  label: 'Position 4',
                  title: 'Narrow vague security duties to industry-standard measures',
                  script:
                    '“Security language should reference reasonable, industry-standard technical and organisational measures rather than absolute outcomes.”',
                },
              ]}
            />
            <RedlineSuggestion
              clauseText={clause}
              clauseType="Data Protection"
              acv={commercialContext.acv.value}
              liabilityCap={lolCap}
            />
            <p className="border-t border-zinc-800 pt-4 text-xs text-zinc-500">{LEGAL_DISCLAIMER}</p>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/review/ip${queryString ? `?${queryString}` : ''}`}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            Back
          </Link>
          <Link
            href={`/review/termination${queryString ? `?${queryString}` : ''}`}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400"
          >
            Continue to Termination
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function DataProtectionReviewPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black p-6 text-white">Loading review…</main>}>
      <DataProtectionReviewContent />
    </Suspense>
  );
}
