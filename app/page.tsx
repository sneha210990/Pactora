import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="flex flex-col items-center justify-center px-4 py-16 text-center md:py-32">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
          Contract review for SaaS teams
        </p>
        <h1 className="mb-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
          Understand SaaS contract risk before legal review
        </h1>
        <p className="mb-10 max-w-xl text-lg text-zinc-400 md:text-xl">
          Pactora helps SaaS teams spot liability, indemnity, IP, termination,
          and data issues. Know what to push back on before the contract reaches
          legal.
        </p>
        <Link
          href="/deals/new"
          className="inline-block rounded-lg bg-white px-7 py-3.5 font-semibold text-black transition hover:bg-zinc-200"
        >
          Start contract review
        </Link>
        <div className="mt-8 flex flex-col items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
            Featured in
          </span>
          <a
            href="https://timesofindia.indiatimes.com/city/hyderabad/courtrooms-to-code-hyderabads-young-lawyers-tap-into-ai-to-tackle-legal-hurdles/articleshow/131267827.cms"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 opacity-60 transition-opacity hover:opacity-100"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/toi-logo.png"
              alt="Times of India"
              width={24}
              height={24}
              className="h-6 w-6 rounded-sm"
            />
            <span className="font-serif text-base font-bold tracking-tight text-white">
              Times of India
            </span>
          </a>
        </div>
      </section>

      <section className="border-t border-zinc-800 bg-black py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-8 text-center sm:flex-row sm:text-left">
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
