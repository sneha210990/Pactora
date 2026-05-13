import Link from 'next/link';

const faqs = [
  {
    question: 'Is Pactora legal advice?',
    answer:
      'No. Pactora is decision-support software. It helps you understand contract risk and structure your review — but outputs are not legal advice. Always apply qualified legal review before relying on them for material decisions.',
  },
  {
    question: 'What types of contracts can I review?',
    answer:
      'Customer MSAs, vendor agreements, order forms, and procurement templates. Pactora is optimised for commercial SaaS and B2B agreements.',
  },
  {
    question: 'What clauses does Pactora analyse?',
    answer:
      'Liability caps, indemnities, IP ownership and licensing, termination and renewal terms, and data protection obligations — the clauses most likely to affect commercial exposure in a SaaS deal.',
  },
  {
    question: 'Can I use Pactora before sending a contract to legal?',
    answer:
      "Yes — that's exactly what it's designed for. Use Pactora to understand the main risk areas and identify what needs attention before it reaches your legal team.",
  },
  {
    question: 'How should I use the output?',
    answer:
      'Use the risk summary to align stakeholders, prepare negotiation positions, and send cleaner, more focused issues to your legal team. The output is a starting point, not a final answer.',
  },
  {
    question: 'What file formats are supported?',
    answer: 'PDF and Word documents (.docx).',
  },
  {
    question: 'Is my contract kept confidential?',
    answer:
      'Yes. Uploaded contracts are handled as confidential business information. Pactora does not use your contract content to train public AI models. See the Privacy page for full details.',
  },
  {
    question: 'Who processes my contract?',
    answer:
      'Contract text is processed via the Claude API (Anthropic) to extract and analyse clauses. See the Subprocessors page for a full list of providers involved in running the service.',
  },
  {
    question: 'Is Pactora a finished product?',
    answer:
      'No — Pactora is in active beta. Features are still evolving and some outputs may be incomplete. We actively use feedback to improve the product.',
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      <section className="mx-auto max-w-3xl px-4 py-20 md:py-24">
        <p className="mb-4 text-xs uppercase tracking-[0.2em] text-zinc-500">Support</p>
        <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mb-16 max-w-xl text-lg text-zinc-400">
          Common questions about what Pactora does, how it works, and how to use it.
        </p>

        <div className="space-y-8">
          {faqs.map((faq) => (
            <div key={faq.question} className="border-t border-zinc-800 pt-8">
              <h2 className="mb-3 font-semibold text-zinc-100">{faq.question}</h2>
              <p className="text-sm leading-relaxed text-zinc-400">{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
          <p className="text-sm text-zinc-300">
            Something not answered here?{' '}
            <Link href="/feedback" className="text-white underline underline-offset-4 hover:text-zinc-200">
              Send us a message
            </Link>{' '}
            and we&apos;ll get back to you.
          </p>
        </div>

        <p className="mt-10 text-sm text-zinc-500">
          Related:{' '}
          <Link href="/how-it-works" className="underline underline-offset-4 hover:text-zinc-300">
            How it works
          </Link>{' '}
          ·{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-zinc-300">
            Privacy
          </Link>{' '}
          ·{' '}
          <Link href="/subprocessors" className="underline underline-offset-4 hover:text-zinc-300">
            Subprocessors
          </Link>
        </p>
      </section>
    </main>
  );
}
