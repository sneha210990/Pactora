import Link from 'next/link';
import { FeedbackForm } from '@/components/feedback-form';

const sampleReviewHref =
  '/review/lol?sample=true&acv=25000&termMonths=12&insuranceCover=1000000&dataType=standard';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <section className="border-b border-zinc-800 px-6 py-20 md:py-24">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="max-w-2xl">
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">Pactora</h1>

            <p className="mb-10 text-xl text-zinc-400">
              Risk-Weighted Contract Intelligence for SaaS Teams. Move from reactive legal review to quantified
              commercial decision-making.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/deals/new"
                className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
              >
                Start review
              </Link>
              <Link
                href={sampleReviewHref}
                className="inline-block rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-white transition hover:bg-zinc-900"
              >
                See sample review
              </Link>
            </div>

            <p className="mt-5 text-xs uppercase tracking-wide text-amber-300">Demo mode: sign-in is temporarily disabled</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30">
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Uploaded contract</p>
                <p className="mt-2 text-sm font-medium text-zinc-100">Customer Master Services Agreement.pdf</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Extracted clauses</p>
                <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                  <li>• Limitation of liability</li>
                  <li>• Indemnities</li>
                  <li>• IP ownership</li>
                  <li>• Termination</li>
                </ul>
              </div>

              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                <p className="text-sm font-semibold text-zinc-100">Weighted review</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">Priority issues detected</p>
                <ul className="mt-3 space-y-1 text-sm text-zinc-300">
                  <li>• Cap may be overridden by indemnity</li>
                  <li>• Broad data obligations</li>
                  <li>• Long termination notice</li>
                </ul>
                <p className="mt-4 rounded-md border border-amber-600/40 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-200">
                  Overall review priority: Elevated
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-400">
          <span>Used by RevOps and Finance teams</span>
          <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
          <span>Standardized early-stage contract triage</span>
          <span className="hidden h-4 w-px bg-zinc-800 sm:block" />
          <span>Built for SaaS deal velocity</span>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-3xl font-semibold">Product preview</h2>
          <p className="max-w-3xl text-zinc-400">
            Pactora highlights risky clauses, applies weighted commercial context, and provides a clear priority signal so
            teams know where to focus before legal handoff.
          </p>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-12 text-3xl font-semibold">How Pactora Works</h2>

          <div className="grid gap-10 text-left md:grid-cols-3">
            <div>
              <h3 className="mb-3 text-lg font-semibold">1. Upload Contract</h3>
              <p className="text-zinc-400">Drop in your SaaS MSA, vendor agreement, or commercial contract.</p>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">2. Clause Risk Scoring</h3>
              <p className="text-zinc-400">
                Pactora evaluates indemnities, liability caps, IP ownership, termination and assigns weighted commercial
                risk.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">3. Decision Clarity</h3>
              <p className="text-zinc-400">Instantly see quantified risk exposure and negotiation leverage.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-6 text-3xl font-semibold">Who it&apos;s for</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="mb-2 font-semibold">Revenue leaders</h3>
              <p className="text-sm text-zinc-400">Identify deal blockers before approval workflows stall out.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="mb-2 font-semibold">Finance partners</h3>
              <p className="text-sm text-zinc-400">Quantify downside from contract language with consistent criteria.</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h3 className="mb-2 font-semibold">Legal teams</h3>
              <p className="text-sm text-zinc-400">Receive cleaner escalations with issues already triaged and prioritized.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-3xl font-semibold">Trust and security</h2>
          <p className="text-zinc-400">
            Pactora is designed for commercial contract workflows with clear handling boundaries and operational controls
            aligned to modern SaaS expectations.
          </p>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-3xl font-semibold">FAQ</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold">How quickly can I review a contract?</h3>
              <p className="mt-2 text-zinc-400">Most first-pass reviews are completed in minutes, not days.</p>
            </div>
            <div>
              <h3 className="font-semibold">Will Pactora replace legal review?</h3>
              <p className="mt-2 text-zinc-400">
                No. Pactora supports early commercial review and triage. It does not replace qualified legal advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-800 px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-5 text-3xl font-semibold">Ready to review your next contract?</h2>
          <p className="mb-8 text-zinc-400">Start with deal context or explore a sample limitation-of-liability review.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/deals/new"
              className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
            >
              Start review
            </Link>
            <Link
              href={sampleReviewHref}
              className="inline-block rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-white transition hover:bg-zinc-900"
            >
              See sample review
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <FeedbackForm user={null} compact />
        </div>
      </section>
    </main>
  );
}
