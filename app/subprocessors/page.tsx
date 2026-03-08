import Link from 'next/link';

const subprocessors = [
  {
    vendor: 'Vercel',
    category: 'Hosting and web delivery',
    purpose: 'Running the web application, storing uploaded files/data, and supporting availability and backup operations.',
  },
  {
    vendor: 'Supabase',
    category: 'Database and storage',
    purpose: 'Storing application data, document metadata, and supporting authenticated product workflows.',
  },
  {
    vendor: 'Google (OAuth)',
    category: 'Authentication',
    purpose: 'Supporting Google sign-in for account authentication and session access.',
  },
  {
    vendor: 'Pactora-operated processing services',
    category: 'Application processing',
    purpose: 'Processing uploaded documents to extract contract terms and generate structured review outputs.',
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
            Pactora uses the subprocessors below to operate, secure, and support the service. Pactora does not use
            customer content to train public foundation models during beta.
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {subprocessors.map((item) => (
                <tr key={item.vendor} className="border-t border-zinc-800 align-top">
                  <td className="px-4 py-3 text-white">{item.vendor}</td>
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
