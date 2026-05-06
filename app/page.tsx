import Link from 'next/link';

const riskAreas = [
  'Limitation of liability',
  'Indemnity obligations',
  'IP ownership and licensing',
  'Termination and renewal terms',
  'Data processing commitments',
];

const reviewFindings = [
  {
    issue: 'Indemnity carve-out appears uncapped',
    severity: 'High',
    note: 'Potential exposure above negotiated liability cap.',
  },
  {
    issue: 'Termination notice is 90 days',
    severity: 'Medium',
    note: 'Could delay exit from low-value vendor relationship.',
  },
  {
    issue: 'Broad confidentiality obligations survive indefinitely',
    severity: 'Medium',
    note: 'Clarify scope and retention timelines before signature.',
  },
];

const extractedClauses = ['Limitation of Liability', 'Indemnities', 'IP ownership'];

const riskIndicators = ['Liability cap: 1× ACV', 'Indemnity exposure: elevated'];

const productProofCards = [
  {
    title: 'Extracted Clauses',
    description: 'Automatically identifies key commercial clauses like liability, indemnity, and termination.',
  },
  {
    title: 'Risk Labels',
    description: 'Each clause is scored and labelled by risk level (high, medium, low).',
  },
  {
    title: 'Decision Summary',
    description: 'See what to push back on, what to accept, and what needs legal review.',
  },
];

const proofClauses = [
  { title: 'Indemnity', risk: 'High' },
  { title: 'Termination', risk: 'Medium' },
  { title: 'Confidentiality', risk: 'Low' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <section className="border-b border-zinc-800 px-6 py-20 md:py-24">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">Contract review for SaaS teams</p>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
              Understand SaaS contract risk before legal review
            </h1>

            <p className="mb-8 text-lg text-zinc-300 md:text-xl">
              Pactora helps SaaS teams identify liability, indemnity, IP, termination, and negotiation pressure points from
              customer and vendor contracts.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/deals/new"
                className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
              >
                Start contract review
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
              <span>Designed for SaaS agreements</span>
              <span className="hidden text-zinc-700 sm:inline">•</span>
              <span>Decision-support, not legal advice</span>
              <span className="hidden text-zinc-700 sm:inline">•</span>
              <span>Built for faster commercial triage</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30">
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Contract uploaded</p>
                <p className="mt-2 text-sm font-medium text-zinc-100">Customer Master Services Agreement.pdf</p>
                <p className="mt-2 text-xs text-zinc-400">Account: Mid-market CRM provider · 32 pages · Draft v4</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Clause extraction</p>
                <ul className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                  {riskAreas.map((area) => (
                    <li key={area} className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1.5">
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                <p className="text-sm font-semibold text-zinc-100">Commercial risk summary</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Priority issues detected</p>
                <div className="mt-3 space-y-2">
                  {reviewFindings.map((finding) => (
                    <div key={finding.issue} className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-200">{finding.issue}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            finding.severity === 'High'
                              ? 'bg-rose-950 text-rose-300'
                              : 'bg-amber-950 text-amber-300'
                          }`}
                        >
                          {finding.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">{finding.note}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-md border border-amber-600/40 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-200">
                  Overall review priority: Elevated
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-3xl font-semibold">What Pactora actually shows you</h2>

          <div className="grid gap-6 md:grid-cols-3">
            {productProofCards.map((card) => (
              <div key={card.title} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <h3 className="font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{card.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-lg border border-zinc-200 bg-gray-50 p-4 text-zinc-900">
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Extracted clauses</p>
                {proofClauses.map((clause) => (
                  <div key={clause.title} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2">
                    <span className="text-sm font-medium">{clause.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        clause.risk === 'High'
                          ? 'bg-rose-100 text-rose-700'
                          : clause.risk === 'Medium'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {clause.risk}
                    </span>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Selected clause preview</p>
                <h3 className="mt-3 font-semibold">Indemnity</h3>
                <p className="mt-2 rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
                  Customer indemnity obligations apply without a clear cap for third-party claims related to service use.
                </p>
                <p className="mt-3 text-sm text-zinc-600">
                  This may create exposure beyond the negotiated liability position and should be aligned with the overall cap.
                </p>
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  Suggested action: push back or route to legal review before signature.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-400">
          <span>Used by RevOps, Finance, and Legal teams</span>
          <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
          <span>Standardized early-stage contract triage</span>
          <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
          <span>Built for SaaS deal velocity</span>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-3xl font-semibold">Product preview</h2>
          <p className="max-w-3xl text-zinc-400">
            A clear view of how Pactora takes an uploaded contract from clause extraction to a prioritised review outcome.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Contract uploaded</p>
              <p className="mt-2 text-sm font-medium text-zinc-100">Customer MSA.pdf</p>
              <p className="mt-2 text-xs text-zinc-400">32 pages · Draft v4</p>
            </div>
            <p className="hidden text-center text-zinc-500 md:block">↓</p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Extracted clauses</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                {extractedClauses.map((clause) => (
                  <li key={clause}>• {clause}</li>
                ))}
              </ul>
            </div>
            <p className="hidden text-center text-zinc-500 md:block">↓</p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Risk indicators</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                {riskIndicators.map((indicator) => (
                  <li key={indicator}>{indicator}</li>
                ))}
              </ul>
            </div>
            <p className="hidden text-center text-zinc-500 md:block">↓</p>

            <div className="rounded-xl border border-amber-600/40 bg-amber-950/30 p-5">
              <p className="text-xs uppercase tracking-wide text-amber-200">Overall review summary</p>
              <p className="mt-2 text-lg font-semibold text-amber-100">Priority: Elevated</p>
              <p className="mt-2 text-sm text-zinc-200">Escalate indemnity and liability terms before signature.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-3xl font-semibold">How it works</h2>
          <p className="max-w-3xl text-zinc-400">
            Pactora turns long contracts into a structured first-pass review so commercial teams can escalate cleaner,
            faster, and with clearer priorities.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Step 1</p>
              <h3 className="mt-2 text-lg font-semibold">Upload contract</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Add your customer MSA, order form, procurement template, or vendor agreement.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Step 2</p>
              <h3 className="mt-2 text-lg font-semibold">Extract key clauses</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Identify liability, indemnity, IP, termination, and data handling terms in one view.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Step 3</p>
              <h3 className="mt-2 text-lg font-semibold">Prioritize commercial risk</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Surface negotiation pressure points before legal review so teams align faster.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-3xl font-semibold">Who it&apos;s for</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="mb-2 font-semibold">Revenue leaders</h3>
              <p className="text-sm text-zinc-400">Identify deal blockers before approval workflows stall out.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="mb-2 font-semibold">Finance partners</h3>
              <p className="text-sm text-zinc-400">Quantify downside from contract language with consistent criteria.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="mb-2 font-semibold">Legal teams</h3>
              <p className="text-sm text-zinc-400">Receive cleaner escalations with issues already triaged and prioritized.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-3xl font-semibold">Trust and support</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <ul className="space-y-3 text-sm text-zinc-300">
                <li>• Designed for SaaS agreements</li>
                <li>• Decision-support, not legal advice</li>
                <li>• Confidential document handling</li>
                <li>• Human legal review still matters</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <p className="mb-3 text-sm text-zinc-400">Learn how Pactora handles legal, privacy, and security boundaries:</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link href="/terms" className="rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">
                  Terms
                </Link>
                <Link href="/privacy" className="rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">
                  Privacy
                </Link>
                <Link href="/security" className="rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">
                  Security
                </Link>
                <Link href="/subprocessors" className="rounded-md border border-zinc-700 px-3 py-1.5 hover:bg-zinc-800">
                  Subprocessors
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-3xl font-semibold">FAQ</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold">Is Pactora a legal advice tool?</h3>
              <p className="mt-2 text-zinc-400">
                No. Pactora supports structured contract review and early commercial understanding. It does not replace
                legal advice.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">What contracts can I review?</h3>
              <p className="mt-2 text-zinc-400">
                Customer MSAs, vendor agreements, order forms, and other commercial SaaS contracts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Can I use it before legal review?</h3>
              <p className="mt-2 text-zinc-400">
                Yes. Pactora is designed for early commercial triage so legal can focus on high-impact issues.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">How should I use the output?</h3>
              <p className="mt-2 text-zinc-400">
                Use the risk summary to align stakeholders, frame negotiation priorities, and prepare for legal handoff.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center sm:flex-row sm:text-left">
          <p className="text-lg text-zinc-200">Using Pactora in beta? Send feedback</p>
          <Link
            href="/feedback"
            className="inline-flex rounded-lg bg-white px-5 py-2.5 font-semibold text-black transition hover:bg-zinc-200"
          >
            Send feedback
          </Link>
        </div>
      </section>
    </main>
  );
}
