import Link from 'next/link';
import { FeedbackForm } from '@/components/feedback-form';
import { getCurrentSessionUser } from '@/lib/auth';

export default async function Home() {
  const sessionData = await getCurrentSessionUser();

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <section className="flex items-center justify-center px-6 py-24 md:min-h-screen">
        <div className="text-center max-w-2xl">
          <h1 className="mb-6 text-6xl font-bold tracking-tight">Pactora</h1>

          <p className="mb-10 text-xl text-zinc-400">
            Risk-Weighted Contract Intelligence for SaaS Teams. Move from reactive legal review to quantified commercial decision-making.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={sessionData ? '/deals/new' : '/login'}
              className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
            >
              {sessionData ? 'Start Contract Review' : 'Beta Login'}
            </Link>
            <Link
              href="/deals/new"
              className="inline-block rounded-lg border border-zinc-700 px-6 py-3 font-semibold text-white transition hover:bg-zinc-900"
            >
              Explore deal intake
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-24">
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
                Pactora evaluates indemnities, liability caps, IP ownership, termination and assigns weighted commercial risk.
              </p>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">3. Decision Clarity</h3>
              <p className="text-zinc-400">Instantly see quantified risk exposure and negotiation leverage.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-800 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <FeedbackForm user={sessionData?.user ?? null} compact />
        </div>
      </section>
    </main>
  );
}
