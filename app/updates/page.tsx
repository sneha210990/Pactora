import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Updates — Pactora',
  description: 'What\'s new in Pactora — release notes and product updates.',
};

type UpdateEntry = {
  version: string;
  date: string;
  label?: 'New' | 'Improvement' | 'Fix';
  items: { tag: 'New' | 'Improved' | 'Fixed'; text: string }[];
};

const UPDATES: UpdateEntry[] = [
  {
    version: '0.1.7',
    date: 'June 2026',
    items: [
      { tag: 'New', text: 'Agent resilience: each of the eight clause agents now retries automatically on a Haiku fallback if the primary model times out or errors. A clear service-unavailable message is shown if all agents fail — no more silent empty results.' },
      { tag: 'Improved', text: 'Scotland jurisdiction is now fully supported end-to-end. Previously, contracts analysed under Scots law were silently processed without jurisdiction context — this is fixed.' },
      { tag: 'Improved', text: 'Jurisdiction is now shown as a read-only pill on every review page so you can always see which legal context your analysis used.' },
      { tag: 'Improved', text: 'API cost reductions: vision extraction for scanned PDFs now uses Haiku instead of Sonnet (same quality, 20× cheaper); redline thinking budget halved from 4,000 to 1,500 tokens; chunk threshold raised from 100k to 120k characters.' },
    ],
  },
  {
    version: '0.1.6',
    date: 'June 2026',
    items: [
      { tag: 'New', text: 'Light mode: a full light palette is now available, toggled from the header. Uses crisp white cards on a slate-50 background with cool-grey text. Risk labels are automatically boosted to full-saturation colours for legibility.' },
      { tag: 'Improved', text: 'Upload flow step labels fixed. The four steps (contract side → upload → commercial context → acknowledgment) now display consistent 1-of-4 through 4-of-4 numbering.' },
      { tag: 'Improved', text: 'Summary page: risk score now has a label above the number. The "Prepare for negotiation" email section moved to after the clause flags, where it belongs logically.' },
      { tag: 'Fixed', text: 'Removed a dead "Open in PDF" button on the summary page that logged to the console instead of doing anything.' },
      { tag: 'New', text: 'Landing page now includes a "What you get" feature grid explaining the six main outputs (risk verdict, clause checks, negotiation ladder, redlines, cross-clause risks, negotiation email).' },
    ],
  },
  {
    version: '0.1.5',
    date: 'May 2026',
    items: [
      { tag: 'New', text: 'Accepted redlines are now exported as a real Word tracked-changes DOCX using docx.js DeletedText and InsertedText revision nodes — ready to send to the other side.' },
      { tag: 'New', text: 'Redline accept and dismiss controls wired on all five clause review pages (Liability Cap, Indemnities, IP, Data Protection, Termination). Previously only available on the summary page.' },
      { tag: 'New', text: '"Clause not detected" guidance added — when a clause type is absent, the review page now explains what the absence means and whether it is a risk.' },
    ],
  },
  {
    version: '0.1.4',
    date: 'May 2026',
    items: [
      { tag: 'New', text: 'Light/dark mode toggle added to the main navigation, with localStorage persistence across sessions and a flash-prevention script to avoid the wrong theme flickering on load.' },
      { tag: 'New', text: 'Beta banner added across all pages with an updated legal disclaimer.' },
      { tag: 'Fixed', text: 'Logout was blocked by CSRF middleware on some sessions — fixed with a resilient session-parse fallback.' },
      { tag: 'New', text: 'Email notifications sent to the team on feedback form submissions.' },
    ],
  },
  {
    version: '0.1.3',
    date: 'April 2026',
    items: [
      { tag: 'New', text: 'Redline suggestion feature: click "Suggest redline" on any flagged clause to generate alternative contract language. IP Ownership and Indemnities use Sonnet with extended thinking for higher-quality output; other clauses use Haiku.' },
      { tag: 'New', text: 'Word-level diff viewer: side-by-side original vs proposed clause text with word-level highlights using LCS diffing.' },
      { tag: 'New', text: 'Negotiation email generator: one click to produce a ready-to-send email covering all flagged issues in priority order.' },
    ],
  },
  {
    version: '0.1.2',
    date: 'April 2026',
    items: [
      { tag: 'New', text: 'Cross-clause risk engine: deterministic detection of interactions between clauses — for example, an indemnity carve-out that bypasses the liability cap creates a combined exposure not visible when reviewing each clause in isolation.' },
      { tag: 'New', text: 'Risk verdict (0–100 score): a weighted composite score across all flagged clauses with a plain-English verdict — ready to sign, sign with conditions, or not ready.' },
      { tag: 'Improved', text: 'Pre-classification step added: a single cheap Haiku call detects which clause types are present before running specialist agents. Absent clause types are skipped, saving significant cost on contracts that only cover a subset of the eight types.' },
    ],
  },
  {
    version: '0.1.1',
    date: 'March 2026',
    items: [
      { tag: 'New', text: 'Parallel agent architecture: eight specialist clause agents now run concurrently instead of sequentially, reducing analysis time from ~2 minutes to under 30 seconds.' },
      { tag: 'New', text: 'Prompt caching: the contract text is cached across all eight parallel agent calls. Agents 2–8 pay 10% of normal input token pricing.' },
      { tag: 'New', text: 'Extended thinking enabled for IP Ownership and Indemnities — the two clause types that require multi-step legal chain reasoning.' },
      { tag: 'Improved', text: 'Anti-hallucination check: every extracted clause text is verified against the original document before being flagged. Unverified findings are marked and logged.' },
    ],
  },
  {
    version: '0.1.0',
    date: 'February 2026',
    items: [
      { tag: 'New', text: 'Initial launch. Contract upload (PDF, DOCX, DOC), text extraction, and AI analysis across eight clause types: Liability Cap, Indemnities, IP Ownership, Data Protection, Termination Rights, Auto-Renewal, Fee Increases, and Governing Law.' },
      { tag: 'New', text: 'Jurisdiction support for England & Wales, India, Germany, and France, with jurisdiction-specific legal thresholds and risk calibration.' },
      { tag: 'New', text: 'Three-position negotiation ladder for every flagged clause, with ready-to-use scripts.' },
      { tag: 'New', text: 'Commercial context extraction: ACV, contract term, liability cap, insurance cover, and data type detected automatically from the contract text.' },
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  New: 'bg-blue-900/50 text-blue-300 border-blue-800',
  Improved: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  Fixed: 'bg-amber-900/40 text-amber-300 border-amber-800',
};

export default function UpdatesPage() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* Hero */}
      <section className="border-b border-zinc-800 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Changelog</p>
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">What&apos;s new</h1>
          <p className="text-lg text-zinc-400">
            A running log of improvements, new features, and fixes shipped to Pactora.
          </p>
        </div>
      </section>

      {/* Entries */}
      <section className="px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <div className="space-y-14">
            {UPDATES.map((entry) => (
              <div key={entry.version} className="relative pl-6">
                {/* timeline line */}
                <div className="absolute left-0 top-2 h-full w-px bg-zinc-800" aria-hidden="true" />
                <div className="absolute left-[-4px] top-2 h-2.5 w-2.5 rounded-full border-2 border-zinc-600 bg-black" aria-hidden="true" />

                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-300">
                    v{entry.version}
                  </span>
                  <span className="text-xs text-zinc-500">{entry.date}</span>
                </div>

                <ul className="space-y-3">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TAG_STYLES[item.tag]}`}
                      >
                        {item.tag}
                      </span>
                      <p className="text-sm leading-relaxed text-zinc-300">{item.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-zinc-800 px-4 py-14">
        <div className="mx-auto max-w-3xl flex flex-wrap items-center gap-4">
          <Link
            href="/deals/new"
            className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Try the latest version
          </Link>
          <Link href="/docs" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            Read the docs →
          </Link>
        </div>
      </section>

    </main>
  );
}
