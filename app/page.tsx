import Link from "next/link";

const FEATURES = [
  {
    title: "Risk verdict",
    description:
      "Get a plain-English verdict — ready to sign, sign with conditions, or not ready — with a 0–100 risk score weighted across all flagged clauses.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Eight clause checks",
    description:
      "Specialist AI agents review liability cap, indemnities, IP ownership, data protection, termination, governing law, force majeure, and confidentiality.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    title: "Negotiation ladder",
    description:
      "For every flagged clause, get a three-position fallback ladder: your opening ask, a credible fallback, and a narrowing position — with ready-to-use scripts.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
      </svg>
    ),
  },
  {
    title: "Redline suggestions",
    description:
      "One click to generate alternative clause wording. Accept redlines and export a tracked-changes Word document ready to send back to the other side.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    title: "Cross-clause risks",
    description:
      "Detects where two clauses interact to create combined exposure not visible when reviewing each in isolation — the kind of issue often missed in clause-by-clause review.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: "Negotiation email",
    description:
      "Generate a ready-to-send negotiation email covering all flagged issues in priority order. Copy it straight into your inbox.",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="flex flex-col items-center justify-center px-4 py-14 text-center md:py-24">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
          For founders and freelancers
        </p>
        <h1 className="mb-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Understand what&apos;s in your contract and how to negotiate it.
        </h1>
        <p className="mb-10 max-w-xl text-lg text-zinc-400 md:text-xl">
          Pactora analyses eight key clauses for risk, then gives you a
          negotiation ladder with clear positions and scripts. Know exactly
          what to push back on before the contract reaches legal.
        </p>

        <Link
          href="/deals/new"
          className="inline-block rounded-lg bg-white px-7 py-3.5 font-semibold text-black transition hover:bg-zinc-200"
        >
          Analyse my contract for free
        </Link>
        <Link
          href="/how-it-works"
          className="mt-4 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          See how it works →
        </Link>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-10">
          <div className="flex flex-col items-center gap-3">
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

          <div className="flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Member of
            </span>
            <a
              href="https://www.techscaler.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 opacity-50 transition-opacity hover:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/techscaler-logo-white.svg"
                alt="Techscaler by CodeBase"
                className="h-5 w-auto"
              />
              <span className="text-xs text-zinc-400">Techscaler by CodeBase</span>
            </a>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Winner
            </span>
            <a
              href="https://vibecode.law"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 opacity-50 transition-opacity hover:opacity-100"
            >
              <span className="text-base leading-none">🏆</span>
              <span className="flex flex-col text-left">
                <span className="text-sm font-semibold tracking-tight text-white">
                  Simplify Legal Challenge
                </span>
                <span className="text-xs text-zinc-500">vibecode.law</span>
              </span>
            </a>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Trusted by
            </span>
            <div className="flex items-center gap-5">
              <a
                href="https://www.librabit.co.uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="opacity-50 transition-opacity hover:opacity-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/librabit-logo.svg"
                  alt="Librabit"
                  className="h-7 w-7 rounded-sm"
                />
              </a>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/ganda-pr-logo.svg"
                alt="G&A PR Ltd"
                className="h-7 w-7 rounded-full opacity-50"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800/60 px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            What you get
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400">
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/deals/new"
              className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Try it free — no sign-up needed
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
