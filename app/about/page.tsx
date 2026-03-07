import Link from 'next/link';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <section className="border-b border-zinc-800 px-6 py-20 md:py-24">
        <div className="mx-auto w-full max-w-4xl">
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">Company</p>
          <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">About Pactora</h1>
          <div className="space-y-3 text-lg text-zinc-300">
            <p>Structured contract review for SaaS teams.</p>
            <p>
              Pactora helps teams evaluate commercial contracts in context — connecting clause-level review with
              deal-level risk.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="mb-6 text-3xl font-semibold">Why Pactora exists</h2>
          <div className="space-y-4 text-zinc-300">
            <p>Commercial contracts are one of the most important risk surfaces in a software business.</p>
            <p>
              For SaaS companies, customer agreements, vendor contracts, and platform terms can materially affect
              liability exposure, intellectual property, data obligations, and negotiation leverage.
            </p>
            <p>
              Most existing tools either focus on legal workflow management or AI summarisation. Neither reflects how
              commercial risk is actually assessed in practice.
            </p>
            <p>Pactora was built to bring a more structured, commercially-aware approach to contract review into software.</p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="mb-6 text-3xl font-semibold">The problem Pactora addresses</h2>
          <ul className="space-y-3 text-zinc-300">
            <li>• Contract risk rarely sits in a single clause</li>
            <li>• Liability, indemnity, IP, data, and termination provisions often interact</li>
            <li>• Teams without immediate legal support struggle to identify these patterns consistently</li>
            <li>• Escalating every agreement is slow; accepting every agreement without clarity is risky</li>
          </ul>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="mb-6 text-3xl font-semibold">What Pactora does</h2>
          <div className="space-y-4 text-zinc-300">
            <p>
              Pactora is a SaaS platform designed to help teams review commercial contracts through a structured
              workflow.
            </p>
            <p>
              Instead of summarising documents, it focuses on the clauses most likely to shape commercial exposure and
              negotiation effort.
            </p>
            <p>It helps teams understand:</p>
            <ul className="grid gap-2 pl-1 sm:grid-cols-2">
              <li>• liability structures</li>
              <li>• indemnity scope</li>
              <li>• IP ownership and licence positions</li>
              <li>• data protection obligations</li>
              <li>• termination rights and survival effects</li>
            </ul>
            <p className="rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-zinc-200">
              Pactora is not designed to replace legal advice. It is designed to improve early-stage commercial
              understanding and review.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="mb-8 text-3xl font-semibold">How Pactora works</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 text-lg font-semibold">1. Deal context</h3>
              <p className="text-zinc-300">
                Reviews begin with commercial context such as deal value, term, insurance expectations, and data
                profile.
              </p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 text-lg font-semibold">2. Clause identification</h3>
              <p className="text-zinc-300">Pactora extracts the contract sections most likely to affect commercial exposure.</p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 text-lg font-semibold">3. Risk interpretation</h3>
              <p className="text-zinc-300">
                The platform highlights where clauses and obligations may interact in ways that materially change risk.
              </p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 text-lg font-semibold">4. Decision support</h3>
              <p className="text-zinc-300">
                Outputs are structured to help teams decide what looks acceptable, what needs negotiation, and what may
                need legal escalation.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="mb-8 text-3xl font-semibold">Who Pactora is designed for</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 text-lg font-semibold">Founders and operators</h3>
              <p className="text-zinc-300">Get a faster first-pass view before escalating for deeper legal review.</p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 text-lg font-semibold">Commercial and procurement teams</h3>
              <p className="text-zinc-300">
                Prepare negotiation focus points and identify contract terms that may affect delivery or leverage.
              </p>
            </article>
            <article className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="mb-2 text-lg font-semibold">Legal and legal-adjacent teams</h3>
              <p className="text-zinc-300">Use structured outputs to support triage, escalation, and internal review.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="mb-6 text-3xl font-semibold">Product philosophy</h2>
          <div className="space-y-4 text-zinc-300">
            <p>
              Contracts are not just collections of clauses. They are commercial systems where provisions interact to
              shape real exposure. Pactora is built on the idea that effective review should connect legal drafting
              with commercial context.
            </p>
            <ul className="space-y-2">
              <li>• deal context matters</li>
              <li>• clause interaction matters</li>
              <li>• structured output matters</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h2 className="mb-6 text-3xl font-semibold">Current stage</h2>
          <p className="text-zinc-300">
            Pactora is an early product exploring how structured contract analysis can support commercial
            decision-making for SaaS teams. It is evolving through hands-on product iteration and feedback from
            commercial, operational, and legal users.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center md:p-10">
          <h2 className="mb-3 text-3xl font-semibold">Start a review</h2>
          <p className="mb-8 text-zinc-300">Explore the workflow and see how Pactora structures early contract review.</p>
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
