export default function SubprocessorsPage() {
  const subprocessors = [
    {
      provider: 'Cloud Hosting Provider (placeholder)',
      purpose: 'Application hosting and data storage',
      location: 'UK / EU / US (to be confirmed)',
    },
    {
      provider: 'Analytics Provider (placeholder)',
      purpose: 'Product analytics and usage monitoring',
      location: 'US (to be confirmed)',
    },
    {
      provider: 'Support Provider (placeholder)',
      purpose: 'User support operations',
      location: 'UK / EU (to be confirmed)',
    },
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">Subprocessors</h1>
          <p className="text-sm text-zinc-400">
            Pactora uses third-party providers to operate and support the service. This list is a
            beta placeholder and will be updated before broader launch.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/60">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Location</th>
              </tr>
            </thead>
            <tbody>
              {subprocessors.map((subprocessor) => (
                <tr key={subprocessor.provider} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-white">{subprocessor.provider}</td>
                  <td className="px-4 py-3">{subprocessor.purpose}</td>
                  <td className="px-4 py-3">{subprocessor.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
