import Link from "next/link";

const STEPS = [
  {
    step: "01",
    title: "Upload your contract",
    body: "PDF or Word. Vendor agreements, client contracts, NDAs, service agreements — any contract with standard clauses.",
  },
  {
    step: "02",
    title: "Get a risk breakdown",
    body: "Eight key clauses analysed. Plain English flags on what's unusual, missing, or one-sided — with context on why it matters.",
  },
  {
    step: "03",
    title: "Get your negotiation ladder",
    body: "For every flagged clause, you get a clear position to take and a script to use. Go into the conversation prepared.",
  },
];

const CLAUSES = [
  {
    name: "Liability Cap",
    description: "Are you exposed to unlimited liability, or is your exposure actually capped?",
  },
  {
    name: "Indemnities",
    description: "Are you agreeing to cover their legal costs as well as your own?",
  },
  {
    name: "IP Ownership",
    description: "Who owns what you create, build, or bring to this contract?",
  },
  {
    name: "Data Protection",
    description: "What are you responsible for if data is mishandled or breached?",
  },
  {
    name: "Termination Rights",
    description: "Can they walk away, keep your work, and owe you nothing?",
  },
  {
    name: "Auto-Renewal",
    description: "Is the contract renewing automatically without your active consent?",
  },
  {
    name: "Fee Increases",
    description: "Can they raise their fees mid-contract without your approval?",
  },
  {
    name: "Governing Law",
    description: "Which country's courts decide if something goes wrong?",
  },
];

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Intro */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
          How it works
        </h1>
        <p className="mt-6 text-lg text-zinc-400">
          From contract received to negotiation-ready — without a lawyer.
        </p>
      </section>

      {/* Steps */}
      <section className="border-t border-zinc-800 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(({ step, title, body }) => (
              <div
                key={step}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                  {step}
                </p>
                <h2 className="mb-2 font-semibold text-white">{title}</h2>
                <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clauses */}
      <section className="border-t border-zinc-800 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Eight clauses. Most contracts have at least one issue.
          </h2>
          <p className="mb-10 max-w-xl text-zinc-400">
            The clauses most likely to create risk for founders and freelancers
            — buried in standard templates and easy to miss.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {CLAUSES.map(({ name, description }) => (
              <div
                key={name}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5"
              >
                <p className="mb-2 text-sm font-semibold text-white">{name}</p>
                <p className="text-xs leading-relaxed text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Negotiation ladder */}
      <section className="border-t border-zinc-800 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight md:text-3xl">
            Not just what&apos;s wrong — what to do about it.
          </h2>
          <p className="mb-4 text-zinc-400">
            Most tools flag the problem and stop there. Pactora gives you a
            negotiation ladder for every flagged clause — your ideal position,
            an acceptable fallback, and the exact script to open the
            conversation.
          </p>
          <p className="text-zinc-400">
            Whether you&apos;re pushing back by email or sitting across a table,
            you&apos;ll know exactly what to say.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <Link
            href="/deals/new"
            className="inline-block rounded-lg bg-white px-7 py-3.5 font-semibold text-black transition hover:bg-zinc-200"
          >
            Review a contract free
          </Link>
        </div>
      </section>
    </main>
  );
}
