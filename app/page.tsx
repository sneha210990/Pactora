import Link from "next/link";

const heroClauses = [
  "Limitation of liability",
  "Indemnity obligations",
  "IP ownership and licensing",
  "Termination and renewal terms",
  "Data processing commitments",
];

const heroFindings = [
  {
    issue: "Uncapped indemnity carve-out",
    severity: "High",
    note: "Could create exposure above the agreed liability cap.",
  },
  {
    issue: "90-day termination notice",
    severity: "Medium",
    note: "May delay exit from a low-value vendor relationship.",
  },
  {
    issue: "Confidentiality survives indefinitely",
    severity: "Medium",
    note: "Clarify scope and retention before signature.",
  },
];

const previewClauses = [
  {
    title: "Indemnity",
    risk: "High",
    summary: "Customer claims are carved out from the liability cap.",
  },
  {
    title: "Limitation of liability",
    risk: "Medium",
    summary: "Cap is set at 1× annual contract value.",
  },
  {
    title: "Termination",
    risk: "Medium",
    summary: "Renewal requires 90 days’ written notice.",
  },
  {
    title: "IP ownership",
    risk: "Low",
    summary: "Customer keeps its data and pre-existing materials.",
  },
];

const productProofCards = [
  {
    title: "Find the clauses that matter",
    description:
      "See liability, indemnity, IP, termination, and data terms in one structured view.",
  },
  {
    title: "See which clauses create the biggest exposure",
    description:
      "Risk badges show where contract language may increase cost, delay, or negotiation pressure.",
  },
  {
    title: "Know what to push back on",
    description:
      "Suggested actions help teams decide what to accept, negotiate, or route to legal review.",
  },
];

const trustPoints = [
  {
    title: "Not legal advice",
    description:
      "Pactora supports review and triage. Final decisions should be reviewed by legal counsel.",
  },
  {
    title: "Human review required",
    description:
      "Use Pactora to prioritise issues, not replace professional judgment.",
  },
  {
    title: "Confidential handling",
    description: "Uploaded documents are treated as confidential product data.",
  },
  {
    title: "Transparent policies",
    description:
      "Security, privacy, and subprocessors are documented publicly.",
  },
];

function RiskBadge({ risk }: { risk: string }) {
  const classes =
    risk === "High"
      ? "bg-rose-950 text-rose-300 ring-rose-800"
      : risk === "Medium"
        ? "bg-amber-950 text-amber-300 ring-amber-800"
        : "bg-emerald-950 text-emerald-300 ring-emerald-800";

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${classes}`}
    >
      {risk}
    </span>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="border-b border-zinc-800 bg-black py-20 text-white md:py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-12 px-4 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
              Contract review for SaaS teams
            </p>
            <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
              Understand SaaS contract risk before legal review
            </h1>

            <p className="mb-8 text-lg text-zinc-300 md:text-xl">
              Pactora helps SaaS teams spot liability, indemnity, IP,
              termination, and data issues. Know what to push back on before the
              contract reaches legal.
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
              <span className="hidden text-zinc-300 sm:inline">•</span>
              <span>Decision-support, not legal advice</span>
              <span className="hidden text-zinc-300 sm:inline">•</span>
              <span>Built to understand contract risk quickly</span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30">
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Contract uploaded
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-100">
                  Customer Master Services Agreement.pdf
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  Account: Mid-market CRM provider · 32 pages · Draft v4
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Clause extraction
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                  {heroClauses.map((area) => (
                    <li
                      key={area}
                      className="rounded-md border border-zinc-800 bg-zinc-950/70 px-2 py-1.5"
                    >
                      {area}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                <p className="text-sm font-semibold text-zinc-100">
                  Risk summary
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  Clauses to review first
                </p>
                <div className="mt-3 space-y-2">
                  {heroFindings.map((finding) => (
                    <div
                      key={finding.issue}
                      className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-zinc-200">{finding.issue}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            finding.severity === "High"
                              ? "bg-rose-950 text-rose-300"
                              : "bg-amber-950 text-amber-300"
                          }`}
                        >
                          {finding.severity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">
                        {finding.note}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 rounded-md border border-amber-600/40 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-200">
                  Suggested next step: push back on indemnity scope.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 bg-black py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">Product preview</h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Pactora turns an uploaded contract into a practical review
            workspace. Teams can see which clauses create the biggest exposure
            and decide what needs attention first.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {productProofCards.map((card) => (
              <div
                key={card.title}
                className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 shadow-sm shadow-black/30"
              >
                <h3 className="font-semibold text-zinc-100">{card.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{card.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-sm shadow-black/30">
            <div className="gap-6 lg:flex">
              <div className="lg:w-5/12">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Clause list
                </p>
                <div className="mt-4 space-y-3">
                  {previewClauses.map((clause) => (
                    <div
                      key={clause.title}
                      className="rounded-lg border border-zinc-800 bg-black/40 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-zinc-100">
                          {clause.title}
                        </h3>
                        <RiskBadge risk={clause.risk} />
                      </div>
                      <p className="mt-2 text-sm text-zinc-400">
                        {clause.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 lg:mt-0 lg:flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Clause detail
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold">Indemnity</h3>
                  <RiskBadge risk="High" />
                </div>

                <div className="mt-4 rounded-lg border border-zinc-800 bg-black/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Clause text
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    Supplier will indemnify Customer for third-party claims
                    arising from use of the services. These obligations are
                    excluded from the limitation of liability.
                  </p>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Explanation
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">
                      The carve-out may bypass the negotiated cap. It can
                      increase exposure if claims are broad.
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-600/40 bg-amber-950/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      Suggested action
                    </p>
                    <p className="mt-2 text-sm font-medium text-amber-200">
                      Push back on the carve-out or route the clause to legal
                      review before signature.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 bg-black py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Pactora gives commercial teams a structured first pass. Use it to
            understand contract risk quickly and send cleaner issues to legal.
          </p>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 shadow-sm shadow-black/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Step 1
              </p>
              <h3 className="mt-2 text-lg font-semibold">Upload contract</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Add a customer MSA, order form, procurement template, or vendor
                agreement.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 shadow-sm shadow-black/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Step 2
              </p>
              <h3 className="mt-2 text-lg font-semibold">Review key clauses</h3>
              <p className="mt-2 text-sm text-zinc-400">
                See liability, indemnity, IP, termination, and data terms with
                risk labels.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 shadow-sm shadow-black/30">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Step 3
              </p>
              <h3 className="mt-2 text-lg font-semibold">Decide next steps</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Know what to accept, what to push back on, and what needs legal
                review.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 bg-black py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">Who it&apos;s for</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 shadow-sm shadow-black/30">
              <h3 className="mb-2 font-semibold">Revenue leaders</h3>
              <p className="text-sm text-zinc-400">
                Spot deal blockers before approval workflows stall.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 shadow-sm shadow-black/30">
              <h3 className="mb-2 font-semibold">Finance partners</h3>
              <p className="text-sm text-zinc-400">
                See which clauses may create cost, delay, or unmanaged exposure.
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 shadow-sm shadow-black/30">
              <h3 className="mb-2 font-semibold">Legal teams</h3>
              <p className="text-sm text-zinc-400">
                Receive cleaner escalations with the main issues already
                triaged.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 bg-black py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">Trust and support</h2>
          <p className="mt-3 max-w-3xl text-zinc-400">
            Pactora is built for contract review support. Legal, privacy, and
            security boundaries are clear.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {trustPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 shadow-sm shadow-black/30"
              >
                <h3 className="font-semibold text-zinc-100">{point.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/terms"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-zinc-300 hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-zinc-300 hover:text-white"
            >
              Privacy
            </Link>
            <Link
              href="/security"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-zinc-300 hover:text-white"
            >
              Security
            </Link>
            <Link
              href="/subprocessors"
              className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-zinc-300 hover:text-white"
            >
              Subprocessors
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 bg-black py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-semibold">FAQ</h2>
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="font-semibold">Is Pactora a legal advice tool?</h3>
              <p className="mt-2 text-zinc-400">
                No. Pactora supports structured contract review and triage. It
                does not replace legal advice.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">What contracts can I review?</h3>
              <p className="mt-2 text-zinc-400">
                Customer MSAs, vendor agreements, order forms, and other
                commercial SaaS contracts.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">
                Can I use it before legal review?
              </h3>
              <p className="mt-2 text-zinc-400">
                Yes. Use Pactora to prioritise high-impact issues before legal
                review.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">How should I use the output?</h3>
              <p className="mt-2 text-zinc-400">
                Use the risk summary to align stakeholders, plan negotiation
                points, and prepare for legal handoff.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-black py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 text-center shadow-sm shadow-black/30 sm:flex-row sm:text-left">
            <div>
              <h2 className="text-xl font-semibold">Using Pactora in beta?</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Send feedback on the review flow and contract outputs.
              </p>
            </div>
            <Link
              href="/feedback"
              className="inline-flex rounded-lg bg-white px-5 py-2.5 font-semibold text-black transition hover:bg-zinc-200"
            >
              Send feedback
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
