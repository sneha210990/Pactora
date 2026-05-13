import Link from "next/link";

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <section className="mx-auto max-w-5xl px-4 py-20 md:py-24">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">Product</p>
        <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">
          How it works
        </h1>
        <p className="max-w-2xl text-lg text-zinc-300">
          Pactora turns an uploaded contract into a structured review workspace in minutes — so commercial teams can understand what they're agreeing to before it reaches legal.
        </p>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 1
            </p>
            <h2 className="mt-3 text-lg font-semibold">Upload your contract</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Add a customer MSA, vendor agreement, order form, or procurement template as a PDF or Word document.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 2
            </p>
            <h2 className="mt-3 text-lg font-semibold">Review the key clauses</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Pactora extracts liability, indemnity, IP, termination, and data terms — each with a risk label and a plain-language explanation.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 3
            </p>
            <h2 className="mt-3 text-lg font-semibold">Decide what to do next</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Suggested actions help you decide what to accept, what to push back on, and what to route to legal review.
            </p>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="text-sm text-zinc-400">
            Pactora is decision-support, not legal advice. Outputs are designed to improve early-stage commercial understanding — always apply qualified human review before relying on them for material decisions.
          </p>
        </div>

        <div className="mt-12">
          <Link
            href="/deals/new"
            className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            Start contract review
          </Link>
        </div>
      </section>
    </main>
  );
}
