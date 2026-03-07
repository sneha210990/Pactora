'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { NegotiationLadder } from '../components/negotiation-ladder';

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

const CLAUSE_STORAGE_KEY = 'pactora.dataClause';

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

function DataProtectionReviewContent() {
  const searchParams = useSearchParams();

  const acv = searchParams.get('acv');
  const termMonths = searchParams.get('termMonths');
  const insuranceCover = searchParams.get('insuranceCover');
  const dataType = searchParams.get('dataType');
  const lolCapParam = searchParams.get('lolCap');

  const acvAmount = num(acv);
  const insuranceAmount = num(insuranceCover);
  const lolCap = num(lolCapParam);

  const [clause, setClause] = useState(() => {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(CLAUSE_STORAGE_KEY) ?? '';
  });
  const [result, setResult] = useState<ReviewResult | null>(null);

  useEffect(() => {
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
  }, [clause]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (acv) params.set('acv', acv);
    if (termMonths) params.set('termMonths', termMonths);
    if (insuranceCover) params.set('insuranceCover', insuranceCover);
    if (dataType) params.set('dataType', dataType);
    if (lolCapParam) params.set('lolCap', lolCapParam);
    return params.toString();
  }, [acv, termMonths, insuranceCover, dataType, lolCapParam]);

  function runReview() {
    setResult(parseClause(clause));
    window.localStorage.setItem(CLAUSE_STORAGE_KEY, clause);
  }

  function reset() {
    window.localStorage.removeItem(CLAUSE_STORAGE_KEY);
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
          <Link
            href="/deals/new"
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
          >
            New Deal
          </Link>
        </div>

        <section className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Data Protection Review</h1>
          <p className="mt-2 text-zinc-400">
            Assess whether GDPR, security, and data-processing obligations create disproportionate risk.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {acvAmount !== null && acvAmount > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">ACV: {money(acvAmount)}</span>
            )}
            {termMonths && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Term: {termMonths} months</span>
            )}
            {insuranceAmount !== null && insuranceAmount > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Insurance: {money(insuranceAmount)}</span>
            )}
            {dataType && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Data: {dataType}</span>
            )}
            {lolCap !== null && lolCap > 0 && (
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">LoL cap: {money(lolCap)}</span>
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
          <section className="mt-8 space-y-6">
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
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
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
