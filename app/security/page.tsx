export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-amber-300">
            Pactora is currently in beta. This page summarises our current and planned security
            approach.
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Security</h1>
        </header>

        <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
          <div>
            <h2 className="text-base font-semibold text-white">1. Encryption</h2>
            <p className="mt-2">
              Pactora uses or plans to use encryption in transit and at rest across core storage and
              processing components.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">2. Access controls</h2>
            <p className="mt-2">
              Access to production systems is limited to authorised personnel using role-based access
              and authentication controls.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">3. Retention and deletion</h2>
            <p className="mt-2">
              We aim to minimise retained customer data and provide deletion pathways as controls
              mature during beta.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">4. Backups and recovery</h2>
            <p className="mt-2">Backup and recovery design is in progress and will be documented in full before launch.</p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">5. Incident response</h2>
            <p className="mt-2">
              Pactora is establishing incident response workflows. Security queries can be directed to
              hello@pactora.co (placeholder contact).
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">6. Environment separation</h2>
            <p className="mt-2">
              Beta environments and controls may evolve quickly; additional production-grade
              segmentation controls are planned before broader public launch.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
