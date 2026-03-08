import Link from 'next/link';

const subprocessorCategories = [
  {
    category: 'Hosting and storage infrastructure',
    purpose: 'Running the web application, storing uploaded files/data, and supporting availability and backup operations.',
  },
  {
    category: 'Analytics and monitoring',
    purpose: 'Observability, performance tracking, error monitoring, and security/event diagnostics.',
  },
  {
    category: 'Communications and email',
    purpose: 'Operational communications, support responses, and product notifications where enabled.',
  },
  {
    category: 'Authentication and security tooling',
    purpose: 'Identity/access management, abuse prevention, and related security controls.',
  },
  {
    category: 'AI-assisted processing',
    purpose: 'Contract text analysis and generation of structured review outputs used for decision-support workflows. Pactora does not intend to use customer content to train public foundation models in beta.',
  },
] as const;

export default function SubprocessorsPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-amber-300">Pactora Beta</p>
          <h1 className="text-3xl font-semibold tracking-tight">Subprocessors</h1>
          <p className="text-sm text-zinc-400">
            Pactora uses third-party providers to operate, secure, and support the service.
          </p>
          <p className="text-sm text-zinc-400">Effective date: 7 March 2026</p>
          <p className="text-sm text-zinc-400">Last updated: 7 March 2026</p>
        </header>

        <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
          <p>
            Pactora is currently in beta and provider infrastructure may evolve. The categories below
            describe the types of subprocessors/service providers that may process data on Pactora’s
            behalf and why they are used.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {subprocessorCategories.map((item) => (
                <tr key={item.category} className="border-t border-zinc-800 align-top">
                  <td className="px-4 py-3 text-white">{item.category}</td>
                  <td className="px-4 py-3">{item.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="text-sm text-zinc-400">
          This page may be updated as Pactora’s beta infrastructure evolves.
        </p>

        <p className="text-sm text-zinc-400">
          Related pages: <Link href="/terms" className="underline underline-offset-4 hover:text-white">Terms</Link>{' '}
          · <Link href="/privacy" className="underline underline-offset-4 hover:text-white">Privacy</Link>{' '}
          · <Link href="/security" className="underline underline-offset-4 hover:text-white">Security</Link>
        </p>
      </div>
    </main>
  );
}
