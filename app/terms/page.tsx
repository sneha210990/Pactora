export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-amber-300">
            This beta terms page is an initial draft and will be expanded before broader public
            launch.
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Terms of Use</h1>
        </header>

        <section className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
          <div>
            <h2 className="text-base font-semibold text-white">1. Beta product scope</h2>
            <p className="mt-2">
              Pactora is provided as a beta product for internal commercial contract review support.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">2. Not legal advice</h2>
            <p className="mt-2">
              Pactora provides decision-support only and does not provide legal advice.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">3. No solicitor-client relationship</h2>
            <p className="mt-2">
              Use of the service does not create a solicitor-client or lawyer-client relationship.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">4. Verification responsibility</h2>
            <p className="mt-2">
              You are responsible for validating outputs with qualified human reviewers before making
              material decisions.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">5. Authority to upload</h2>
            <p className="mt-2">
              You confirm you have all required rights and permissions to upload contract content to
              Pactora.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">6. Acceptable use</h2>
            <p className="mt-2">
              You must not misuse the service, attempt unauthorised access, or upload unlawful,
              infringing, or malicious content.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">7. Pactora intellectual property</h2>
            <p className="mt-2">
              Pactora and its underlying software, models, and materials remain the property of
              Pactora and its licensors.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">8. Limitation of liability</h2>
            <p className="mt-2">
              To the extent permitted by law, Pactora is provided on an as-is beta basis and liability
              is limited to a reasonable placeholder cap pending final terms.
            </p>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">9. Governing law</h2>
            <p className="mt-2">Governing law and jurisdiction are placeholders and will be confirmed before launch.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
