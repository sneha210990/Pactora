const entries = [
  {
    date: 'May 2026',
    items: [
      'Simplified homepage — cleaner hero, removed clutter',
      'Added FAQ page covering common questions about the product',
      'Added How it works as a standalone page',
      'Tightened About page copy and removed redundant sections',
      'Added Anthropic to subprocessors list',
    ],
  },
  {
    date: 'April 2026',
    items: [
      'Parallel clause analysis — all clause types now run as independent agents, reducing review time',
      'Manual clause entry — paste contract text directly when a file is unavailable',
      'Improved PDF and DOCX extraction accuracy',
      'Added .doc (legacy Word) support',
    ],
  },
  {
    date: 'March 2026',
    items: [
      'Contract integrity engine — detects broken cross-references, duplicate definitions, and undefined terms',
      'Data protection review page',
      'IP ownership review page',
      'Indemnity review page',
      'Termination review page',
      'Launched beta with Supabase authentication and Google sign-in',
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <section className="mx-auto max-w-3xl px-4 py-20 md:py-24">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">Product</p>
        <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">Changelog</h1>
        <p className="mb-16 max-w-xl text-lg text-zinc-400">
          What&apos;s been added, changed, and improved in Pactora.
        </p>

        <div className="space-y-14">
          {entries.map((entry) => (
            <div key={entry.date} className="border-t border-zinc-800 pt-10">
              <p className="mb-6 text-sm font-semibold text-zinc-300">{entry.date}</p>
              <ul className="space-y-3">
                {entry.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-zinc-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
