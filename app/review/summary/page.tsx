'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { FeedbackForm } from '@/components/feedback-form';
import { trackEvent } from '@/components/track-event';
import { useSearchParams } from 'next/navigation';
import type { ClauseAnalysis, ClauseFlag } from '@/lib/clause-analysis';

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

function num(value: string | null): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRisk(value: string | null): RiskLevel | null {
  if (value === 'Low' || value === 'Medium' || value === 'High') return value;
  return null;
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

function clauseFlagRiskClass(risk: ClauseFlag['riskLevel']) {
  if (risk === 'High') return 'border-red-500/40 bg-red-500/10 text-red-200';
  if (risk === 'Medium') return 'border-amber-500/40 bg-amber-500/10 text-amber-200';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200';
}

function ClauseFlagCard({ flag }: { flag: ClauseFlag }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-200">{flag.clauseType}</span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${clauseFlagRiskClass(flag.riskLevel)}`}>
          {flag.riskLevel}
        </span>
      </div>
      {flag.problematicLanguage && (
        <blockquote className="mb-3 border-l-2 border-zinc-600 pl-3">
          <p className="text-xs italic text-zinc-400">"{flag.problematicLanguage}"</p>
        </blockquote>
      )}
      <p className="text-sm text-zinc-300">{flag.plainEnglish}</p>
      <div className="mt-3 rounded-lg border border-zinc-800 bg-black/30 px-3 py-2">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Negotiation point</p>
        <p className="text-xs text-zinc-300">{flag.negotiationPoint}</p>
      </div>
    </div>
  );
}

function SummaryContent() {
  const searchParams = useSearchParams();

  const [user, setUser] = useState<{ email: string } | null>(null);
  const [captureEmail, setCaptureEmail] = useState('');
  const [captureStatus, setCaptureStatus] = useState('');
  const [captureSubmitting, setCaptureSubmitting] = useState(false);
  const [clauseAnalysis, setClauseAnalysis] = useState<ClauseAnalysis | null>(null);

  useEffect(() => {
    trackEvent('analysis_completed', '/review/summary');
    fetch('/api/me')
      .then((response) => response.json())
      .then((data: { user: { email: string } | null }) => setUser(data.user));

    const stored = localStorage.getItem('pactora.clauseAnalysis');
    if (stored) {
      try {
        setClauseAnalysis(JSON.parse(stored) as ClauseAnalysis);
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  useEffect(() => {
    if (user?.email) setCaptureEmail(user.email);
  }, [user?.email]);

  const acv = searchParams.get('acv');
  const termMonths = searchParams.get('termMonths');
  const insuranceCover = searchParams.get('insuranceCover');
  const dataType = searchParams.get('dataType');
  const lolCapParam = searchParams.get('lolCap');

  const acvAmount = num(acv);
  const insuranceAmount = num(insuranceCover);
  const lolCap = num(lolCapParam);
  const capRatio = lolCap !== null && acvAmount !== null && acvAmount > 0 ? lolCap / acvAmount : null;
  const inferredLolRisk = deriveLolRisk(lolCap, acvAmount);
  const queryString = searchParams.toString();

  const rankedSections = useMemo(() => {
    return reviewSections
      .map((section) => {
        const risk = section.key === 'lol' ? inferredLolRisk ?? normalizeRisk(searchParams.get(section.param)) : normalizeRisk(searchParams.get(section.param));
        return {
          ...section,
          risk,
          score: risk ? riskScore(risk) : 0,
          hrefWithParams: `${section.href}${queryString ? `?${queryString}` : ''}`,
        };
      })
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }, [inferredLolRisk, queryString, searchParams]);

  const knownRisks = rankedSections.filter((section) => section.risk !== null) as Array<(typeof rankedSections)[number] & { risk: RiskLevel }>;
  const averageRisk = knownRisks.length > 0 ? knownRisks.reduce((sum, section) => sum + riskScore(section.risk), 0) / knownRisks.length : 0;
  const overallRisk: RiskLevel = knownRisks.some((section) => section.risk === 'High') || averageRisk >= 2.4 ? 'High' : averageRisk >= 1.7 ? 'Medium' : 'Low';

  async function submitCapture(event: FormEvent) {
    event.preventDefault();
    setCaptureSubmitting(true);
    setCaptureStatus('');

    const response = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: 'missing_feature',
        email: captureEmail,
        message: 'Notify me when the consolidated negotiation email is available.',
        page_context: '/review/summary',
        can_contact: true,
        request_call: false,
      }),
    });

    setCaptureSubmitting(false);
    setCaptureStatus(response.ok ? 'You’re on the list — we’ll email you when it ships.' : 'Could not subscribe right now. Please try again later.');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <Link href="/deals/new" className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900">
            New review
          </Link>
        </div>

        <section className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">Deal Summary</h1>
          <p className="mt-2 text-zinc-400">A final view of the commercial and legal risk across the contract.</p>

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
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">Liability cap: {money(lolCap)}</span>
            )}
          </div>

          <nav className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-3" aria-label="Review sections">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Review sections</div>
            <div className="flex flex-wrap gap-2">
              {reviewSections.map((section) => (
                <Link
                  key={section.key}
                  href={`${section.href}${queryString ? `?${queryString}` : ''}`}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900"
                >
                  {section.label}
                </Link>
              ))}
            </div>
          </nav>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Overall risk</h2>
            <div className="mt-3 flex items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${riskClass(overallRisk)}`}>{overallRisk}</span>
              <span className="text-xs text-zinc-500">{knownRisks.length}/5 sections rated</span>
            </div>
            <p className="mt-3 text-sm text-zinc-300">{describeOverall(overallRisk, knownRisks.length, capRatio)}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Key negotiation priorities</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {rankedSections.map((section, index) => (
                <li key={section.key}>
                  <Link href={section.hrefWithParams} className="block rounded-lg border border-zinc-800 bg-black/25 px-3 py-2 hover:border-zinc-600">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-zinc-200">{index < 3 && section.risk ? `${index + 1}. ` : ''}{section.label}</span>
                      {section.risk ? (
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskClass(section.risk)}`}>{section.risk}</span>
                      ) : (
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-400">Not reviewed</span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">{section.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-200">Next: consolidated negotiation email</h2>
            <p className="mt-2 text-sm text-zinc-300">Get notified when Pactora can turn these priorities into a founder-ready negotiation email.</p>
            <form onSubmit={submitCapture} className="mt-4 flex flex-col gap-2">
              <input
                type="email"
                required
                value={captureEmail}
                onChange={(event) => setCaptureEmail(event.target.value)}
                placeholder="you@company.com"
                className="rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
              />
              <button type="submit" disabled={captureSubmitting} className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:bg-zinc-700 disabled:text-zinc-300">
                {captureSubmitting ? 'Subscribing…' : 'Notify me'}
              </button>
            </form>
            {captureStatus ? <p className="mt-2 text-xs text-zinc-300">{captureStatus}</p> : null}
          </div>
        </section>

        {clauseAnalysis && clauseAnalysis.flags.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">AI Clause Analysis</h2>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-300">
                {clauseAnalysis.flags.length} {clauseAnalysis.flags.length === 1 ? 'flag' : 'flags'}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {clauseAnalysis.flags.map((flag, i) => (
                <ClauseFlagCard key={i} flag={flag} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 rounded-2xl border border-zinc-900 bg-black/20 p-4 opacity-90">
          <div className="mb-3 border-b border-zinc-900 pb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Beta feedback</h2>
            <p className="mt-1 text-xs text-zinc-500">Optional — share what would make this summary more useful.</p>
          </div>
          <FeedbackForm user={user} compact />
        </section>

        <div className="mt-8">
          <Link href="/" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
            Back to home
          </Link>
        </div>
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
