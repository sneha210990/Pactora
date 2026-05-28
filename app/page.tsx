import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="flex flex-col items-center justify-center px-4 py-20 text-center md:py-36">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
          For founders, freelancers and anyone signing a contract
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
          Review a contract free
        </Link>

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
              Trusted by
            </span>
            <a
              href="https://www.librabit.co.uk/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center opacity-50 transition-opacity hover:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/librabit-logo.svg"
                alt="Librabit"
                className="h-10 w-10 rounded-md"
              />
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
    </main>
  );
}
