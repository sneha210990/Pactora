import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <section className="border-b border-zinc-800 px-6 py-20 md:py-24">
        <div className="mx-auto w-full max-w-4xl">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">Company</p>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">About Pactora</h1>
          <p className="max-w-2xl text-lg text-zinc-300">
            Pactora helps SaaS teams understand commercial contract risk before it reaches legal review.
          </p>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="mb-6 text-2xl font-semibold">Why it exists</h2>
          <div className="space-y-4 text-zinc-300">
            <p>
              Commercial contracts are one of the most important risk surfaces in a software business. Customer
              agreements, vendor contracts, and platform terms can materially affect liability exposure, intellectual
              property, data obligations, and negotiation leverage.
            </p>
            <p>
              Most teams either escalate everything to legal — which is slow — or accept agreements without enough
              clarity — which is risky. Pactora sits in between: a structured first pass that helps commercial teams
              understand what they're agreeing to and what needs attention before legal review.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="mb-8 text-2xl font-semibold">Who it's for</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 font-semibold">Founders and operators</h3>
              <p className="text-sm text-zinc-300">Get a faster first-pass view before escalating for deeper legal review.</p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 font-semibold">Commercial and procurement teams</h3>
              <p className="text-sm text-zinc-300">
                Prepare negotiation focus points and identify terms that may affect delivery or leverage.
              </p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 font-semibold">Legal and legal-adjacent teams</h3>
              <p className="text-sm text-zinc-300">Receive cleaner escalations with the main issues already triaged.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="mb-6 text-2xl font-semibold">What it does and doesn't do</h2>
          <div className="space-y-4 text-zinc-300">
            <p>
              Pactora extracts the clauses most likely to shape commercial exposure — liability, indemnity, IP,
              termination, and data terms — and structures them with risk labels and suggested actions.
            </p>
            <p className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-zinc-200">
              Pactora is not legal advice and does not replace legal counsel. It is designed to improve early-stage
              commercial understanding and reduce noise before legal review.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="mb-4 text-2xl font-semibold">Current stage</h2>
          <p className="text-zinc-300">
            Pactora is an early product in active development. It is evolving through hands-on iteration and feedback
            from commercial, operational, and legal users.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center md:p-10">
          <h2 className="mb-3 text-2xl font-semibold">Start a review</h2>
          <p className="mb-8 text-zinc-300">Upload a contract and see how Pactora structures early commercial review.</p>
          <Link
            href="/deals/new"
            className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            Start review
          </Link>
        </div>
      </section>
    </main>
  );
}
