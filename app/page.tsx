import Link from "next/link";

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

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-20 text-center md:py-36">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
          For founders and freelancers
        </p>
        <h1 className="mb-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Know what&apos;s in your contract — and how to negotiate it.
        </h1>
        <p className="mb-10 max-w-xl text-lg text-zinc-400 md:text-xl">
          Pactora analyses eight key clauses for risk, then gives you a
          negotiation ladder — clear positions and scripts — so you know exactly
          what to push back on and how to say it.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/deals/new"
            className="inline-block rounded-lg bg-white px-7 py-3.5 font-semibold text-black transition hover:bg-zinc-200"
          >
            Review a contract free
          </Link>
          <Link
            href="/how-it-works"
            className="inline-block rounded-lg px-7 py-3.5 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            See how it works →
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Featured in
            </span>
            <a
              href="https://timesofindia.indiatimes.com/city/hyderabad/courtrooms-to-code-hyderabads-young-lawyers-tap-into-ai-to-tackle-legal-hurdles/articleshow/131267827.cms"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-50 transition-opacity hover:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/toi-logo.png"
                alt="Times of India"
                className="h-5 w-5 rounded-sm"
              />
              <span className="font-serif text-sm font-bold tracking-tight text-white">
                Times of India
              </span>
            </a>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Member of
            </span>
            <a
              href="https://www.techscaler.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-50 transition-opacity hover:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/techscaler-logo-white.svg"
                alt="Techscaler by CodeBase"
                className="h-5 w-auto"
              />
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-zinc-800 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight md:text-3xl">
            From contract received to negotiation-ready
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(({ step, title, body }) => (
              <div
                key={step}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6"
              >
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">
                  {step}
                </p>
                <h3 className="mb-2 font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8 clauses */}
      <section className="border-t border-zinc-800 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Eight clauses. Most contracts have at least one issue.
          </h2>
          <p className="mx-auto mb-12 max-w-xl text-center text-zinc-400">
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

      {/* Negotiation differentiator */}
      <section className="border-t border-zinc-800 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight md:text-3xl">
            Not just what&apos;s wrong — what to do about it.
          </h2>
          <p className="mb-10 text-lg text-zinc-400">
            Most tools flag the problem and stop there. Pactora gives you a
            negotiation ladder for every flagged clause — your ideal position,
            an acceptable fallback, and the exact script to open the
            conversation. Whether you&apos;re pushing back by email or sitting across a
            table.
          </p>
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
