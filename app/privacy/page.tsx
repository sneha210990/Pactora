export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-amber-300">
            This privacy notice is an initial beta version and will be expanded before broader public
            launch.
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Privacy Notice</h1>
        </header>

        <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
          <div>
            <h2 className="text-base font-semibold text-white">1. Data controller</h2>
            <p className="mt-2">
              Pactora is operated by a beta-stage provider entity (final legal entity details to be
              confirmed before broader launch).
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">2. What we collect</h2>
            <p className="mt-2">We collect uploaded contracts, deal context fields, and product usage/security data.</p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">3. Why we process it</h2>
            <p className="mt-2">
              Data is processed to extract terms, generate risk scoring, provide support, and maintain
              service security.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">4. Lawful basis</h2>
            <p className="mt-2">Lawful basis details are placeholders and will be finalised in pre-launch documentation.</p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">5. Retention and deletion</h2>
            <p className="mt-2">Retention periods and deletion workflows are beta placeholders and will be expanded.</p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">6. Sharing and subprocessors</h2>
            <p className="mt-2">
              Pactora uses service providers to operate infrastructure and support workflows. See the
              Subprocessors page for the current placeholder list.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">7. International transfers</h2>
            <p className="mt-2">International transfer safeguards are placeholders pending final provider footprint.</p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">8. User rights</h2>
            <p className="mt-2">
              Users may request access, correction, deletion, and other applicable rights subject to
              local law.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">9. Model training and service improvement</h2>
            <p className="mt-2">
              Uploaded content is not used to train public foundation models. Further details on
              internal service improvement uses will be set out before broader launch.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
