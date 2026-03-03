import Link from "next/link" 
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      {/* Hero */}
      <section className="flex items-center justify-center min-h-screen px-6">
        <div className="text-center max-w-2xl">
          <h1 className="text-6xl font-bold mb-6 tracking-tight">
            Pactora
          </h1>

          <p className="text-xl text-zinc-400 mb-10">
            Risk-Weighted Contract Intelligence for SaaS Teams.
            Move from reactive legal review to quantified commercial decision-making.
          </p>

          <Link
  href="/deals/new"
  className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-zinc-200 transition inline-block"
>
  Start Contract Review
</Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-semibold mb-12">
            How Pactora Works
          </h2>

          <div className="grid md:grid-cols-3 gap-10 text-left">
            <div>
              <h3 className="text-lg font-semibold mb-3">1. Upload Contract</h3>
              <p className="text-zinc-400">
                Drop in your SaaS MSA, vendor agreement, or commercial contract.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">2. Clause Risk Scoring</h3>
              <p className="text-zinc-400">
                Pactora evaluates indemnities, liability caps, IP ownership,
                termination and assigns weighted commercial risk.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">3. Decision Clarity</h3>
              <p className="text-zinc-400">
                Instantly see quantified risk exposure and negotiation leverage.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}