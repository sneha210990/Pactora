import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation — Pactora',
  description: 'How to use Pactora: uploading contracts, reading results, using the negotiation ladder, and understanding what Pactora can and cannot do.',
};

const CLAUSE_EXPLAINERS = [
  {
    name: 'Liability Cap',
    what: 'Limits the maximum amount either party can be held liable for under the contract.',
    flag: 'A cap set below 1× your annual contract value, no mutual cap, or no cap at all.',
  },
  {
    name: 'Indemnities',
    what: 'Requires one party to cover the other\'s legal costs or losses if a specific event occurs.',
    flag: '"Notwithstanding any other provision" language that bypasses the liability cap, or a one-sided indemnity with no reciprocal obligation.',
  },
  {
    name: 'IP Ownership',
    what: 'Defines who owns intellectual property created during or arising from the contract.',
    flag: 'Broad assignment of all IP to the other side, including background IP or reusable methodologies you brought to the engagement.',
  },
  {
    name: 'Data Protection',
    what: 'Sets out data handling obligations, breach notification duties, and sub-processor rules.',
    flag: 'No breach notification window, uncapped data protection liability, or no obligation to return data on termination.',
  },
  {
    name: 'Termination Rights',
    what: 'Controls when and how either party can end the contract.',
    flag: 'No termination for convenience right, very short notice periods, or asymmetric rights that heavily favour one side.',
  },
  {
    name: 'Auto-Renewal',
    what: 'Causes the contract to renew automatically unless a party actively opts out.',
    flag: 'Short opt-out windows (under 30 days), no advance notice requirement, or renewal at higher rates.',
  },
  {
    name: 'Fee Increases',
    what: 'Allows one party to raise fees during the contract term.',
    flag: 'Uncapped increases, no notice requirement, or increases tied to an index with no cap.',
  },
  {
    name: 'Governing Law',
    what: 'Determines which jurisdiction\'s courts and laws apply if a dispute arises.',
    flag: 'A jurisdiction that gives the other side a home advantage, or a mismatch with where you operate.',
  },
];

const RISK_LEVELS = [
  {
    level: 'High',
    colour: 'text-red-400',
    border: 'border-red-900/50',
    bg: 'bg-red-950/30',
    meaning: 'The clause exposes you to significant, concrete risk. Push back before signing.',
  },
  {
    level: 'Medium',
    colour: 'text-amber-400',
    border: 'border-amber-900/50',
    bg: 'bg-amber-950/30',
    meaning: 'The clause is one-sided or missing standard protections. Worth negotiating if you have leverage.',
  },
  {
    level: 'Low',
    colour: 'text-emerald-400',
    border: 'border-emerald-900/50',
    bg: 'bg-emerald-950/30',
    meaning: 'The clause departs from market norms in a minor way. Note it but unlikely to be a dealbreaker.',
  },
];

const FAQS = [
  {
    q: 'Does Pactora give legal advice?',
    a: 'No. Pactora identifies clause patterns and flags risk against known market norms. It is not a law firm and does not create a solicitor-client relationship. For decisions with significant financial or legal consequence, review the output with a qualified lawyer.',
  },
  {
    q: 'What file formats are supported?',
    a: 'PDF (text-based and scanned), DOCX, and legacy DOC files up to 20 MB. For scanned PDFs, Pactora uses AI vision to extract the text — this may take a few seconds longer.',
  },
  {
    q: 'Which jurisdictions are supported?',
    a: 'England & Wales, Scotland, India, Germany, and France. Selecting the right jurisdiction calibrates the risk thresholds and legal references to the applicable law. If your jurisdiction is not listed, select the closest equivalent and treat jurisdiction-specific findings as indicative.',
  },
  {
    q: 'How long does an analysis take?',
    a: 'Typically 15–45 seconds. Results stream in clause by clause as each agent completes — you do not need to wait for all eight to finish before reading the first results.',
  },
  {
    q: 'Can Pactora handle long contracts?',
    a: 'Yes. Contracts over 120,000 characters are automatically split into overlapping chunks and analysed in sections. Results are merged and deduplicated before being shown to you.',
  },
  {
    q: 'What does "Clause not detected" mean?',
    a: 'Pactora could not find that clause type in your contract. This could mean the clause is genuinely absent (common for short NDAs or order forms), or that it uses unusual language the agent did not recognise. It does not mean the contract is safe — the absence of a clause can itself be a risk.',
  },
  {
    q: 'How accurate is the analysis?',
    a: 'Pactora cross-checks every extracted clause text against the original document before flagging it — reducing hallucinated findings. Accuracy varies by contract complexity and clarity. Always read the flagged clause text in context; do not rely solely on Pactora\'s plain-English summary.',
  },
  {
    q: 'Is my contract stored?',
    a: 'Contract text is processed in memory and used to run the analysis. Anonymised clause patterns (with identifying details removed) may be stored to improve detection accuracy over time. See the Privacy Policy for full details.',
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-black text-white">

      {/* Hero */}
      <section className="border-b border-zinc-800 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Documentation</p>
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">How to use Pactora</h1>
          <p className="text-lg text-zinc-400">
            Upload a contract, get clause-by-clause risk flags, and walk into negotiation with a clear position.
          </p>
        </div>
      </section>

      {/* Quick start */}
      <section className="border-b border-zinc-800 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-xl font-semibold">Quick start</h2>
          <ol className="space-y-6">
            {[
              { n: '1', title: 'Choose which side you\'re on', body: 'Pactora calibrates risk thresholds based on whether you\'re the supplier (service provider) or the buyer (client). Selecting the wrong side will produce results skewed toward the other party\'s interests.' },
              { n: '2', title: 'Upload your contract', body: 'PDF, DOCX, or DOC. Text is extracted immediately — no account required for a first analysis. If your PDF is scanned or image-based, allow a few extra seconds for AI vision extraction.' },
              { n: '3', title: 'Set jurisdiction and context', body: 'Select the governing law jurisdiction and optionally enter the annual contract value (ACV) and liability cap if known. These numbers are used to benchmark cap adequacy and generate precise negotiation positions.' },
              { n: '4', title: 'Read the results', body: 'Results stream in clause by clause. Each flag shows the exact contract text, a plain-English explanation, the risk level, and a three-position negotiation ladder.' },
              { n: '5', title: 'Suggest and export redlines', body: 'Click "Suggest redline" on any flagged clause to generate alternative language. Accept redlines to build a tracked-changes DOCX ready to send back to the other side.' },
            ].map(({ n, title, body }) => (
              <li key={n} className="flex gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300">
                  {n}
                </span>
                <div>
                  <p className="mb-1 font-medium text-zinc-100">{title}</p>
                  <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Risk levels */}
      <section className="border-b border-zinc-800 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-xl font-semibold">Risk levels</h2>
          <p className="mb-8 text-sm text-zinc-400">Each flagged clause is assigned one of three risk levels.</p>
          <div className="space-y-3">
            {RISK_LEVELS.map(({ level, colour, border, bg, meaning }) => (
              <div key={level} className={`flex items-start gap-4 rounded-lg border ${border} ${bg} px-4 py-3`}>
                <span className={`mt-0.5 shrink-0 text-sm font-semibold ${colour}`}>{level}</span>
                <p className="text-sm leading-relaxed text-zinc-300">{meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Negotiation ladder */}
      <section className="border-b border-zinc-800 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-xl font-semibold">The negotiation ladder</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Every flagged clause comes with three positions — not just "here is the problem".
          </p>
          <div className="space-y-3">
            {[
              { pos: 'Ask', desc: 'Your opening position. The ideal outcome — push for this first.' },
              { pos: 'Fallback', desc: 'Your credible middle ground. Acceptable if the other side won\'t move all the way.' },
              { pos: 'Narrowing', desc: 'The minimum you should accept. Beyond this, escalate to legal.' },
            ].map(({ pos, desc }) => (
              <div key={pos} className="flex gap-4 rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
                <span className="mt-0.5 shrink-0 text-sm font-semibold text-zinc-300">{pos}</span>
                <p className="text-sm leading-relaxed text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-500">
            Each position includes a ready-to-use script you can drop into an email or use in a call.
          </p>
        </div>
      </section>

      {/* Clause reference */}
      <section className="border-b border-zinc-800 px-4 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-xl font-semibold">Clause reference</h2>
          <p className="mb-8 text-sm text-zinc-400">What each of the eight clause types covers and what triggers a flag.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {CLAUSE_EXPLAINERS.map(({ name, what, flag }) => (
              <div key={name} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
                <p className="mb-2 text-sm font-semibold text-zinc-100">{name}</p>
                <p className="mb-3 text-xs leading-relaxed text-zinc-400">{what}</p>
                <p className="text-xs leading-relaxed text-zinc-500">
                  <span className="font-medium text-zinc-400">Flagged when: </span>{flag}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-zinc-800 px-4 py-14">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-xl font-semibold">Frequently asked questions</h2>
          <div className="space-y-8">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <p className="mb-2 font-medium text-zinc-100">{q}</p>
                <p className="text-sm leading-relaxed text-zinc-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/deals/new"
            className="inline-block rounded-lg bg-white px-7 py-3.5 font-semibold text-black transition hover:bg-zinc-200"
          >
            Analyse a contract
          </Link>
          <Link
            href="/updates"
            className="ml-4 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            See what&apos;s new →
          </Link>
        </div>
      </section>

    </main>
  );
}
