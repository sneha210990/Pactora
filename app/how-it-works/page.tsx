import Link from "next/link";

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-5xl px-4 py-20">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          How it works
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-400">
          Pactora gives commercial teams a structured first pass. Use it to
          understand contract risk quickly and send cleaner issues to legal.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 1
            </p>
            <h2 className="mt-2 text-lg font-semibold">Upload contract</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Add a customer MSA, order form, procurement template, or vendor
              agreement.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 2
            </p>
            <h2 className="mt-2 text-lg font-semibold">Review key clauses</h2>
            <p className="mt-2 text-sm text-zinc-400">
              See liability, indemnity, IP, termination, and data terms with
              risk labels.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Step 3
            </p>
            <h2 className="mt-2 text-lg font-semibold">Decide next steps</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Know what to accept, what to push back on, and what needs legal
              review.
            </p>
          </div>
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
