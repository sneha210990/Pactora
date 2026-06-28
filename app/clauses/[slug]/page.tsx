import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CLAUSE_GUIDES, getClauseGuide } from '@/lib/clause-guide-content';

export function generateStaticParams() {
  return CLAUSE_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getClauseGuide(slug);
  if (!guide) return {};
  return {
    title: `${guide.clauseName} — Pactora Clause Guide`,
    description: guide.heroSummary,
  };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function WarningIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-amber-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-emerald-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SolicitorIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-blue-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Section components ───────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-xl font-semibold text-zinc-100">{children}</h2>
  );
}

function RedFlagCard({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="mt-0.5">
        <WarningIcon />
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">{text}</p>
    </div>
  );
}

function MarketStandardItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="mt-0.5">
        <CheckIcon />
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">{text}</p>
    </div>
  );
}

function LawyerQuestionItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3 py-2">
      <div className="mt-0.5">
        <SolicitorIcon />
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">{text}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ClauseGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getClauseGuide(slug);
  if (!guide) notFound();

  const otherGuides = CLAUSE_GUIDES.filter((g) => g.slug !== slug);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">

      {/* ── Hero ── */}
      <div className="mb-14">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Pactora Clause Guide
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
          {guide.clauseName}
        </h1>
        <p className="text-lg leading-relaxed text-zinc-400">{guide.heroSummary}</p>
      </div>

      {/* ── What it is ── */}
      <section className="mb-12">
        <SectionLabel>Plain English</SectionLabel>
        <SectionHeading>What it is</SectionHeading>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
          {guide.whatItIs.map((para, i) => (
            <p
              key={i}
              className={`text-sm leading-relaxed text-zinc-300 ${i > 0 ? 'mt-3' : ''}`}
            >
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* ── What reasonable looks like ── */}
      <section className="mb-12">
        <SectionLabel>For UK freelancers & small businesses</SectionLabel>
        <SectionHeading>What reasonable looks like</SectionHeading>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
          <ul className="space-y-3">
            {guide.whatReasonableLooksLike.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                <p className="text-sm leading-relaxed text-zinc-300">{item}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Red flags ── */}
      <section className="mb-12">
        <SectionLabel>Watch out for</SectionLabel>
        <SectionHeading>Red flags</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          {guide.redFlags.map((flag, i) => (
            <RedFlagCard key={i} text={flag} />
          ))}
        </div>
      </section>

      {/* ── Market standard ── */}
      <section className="mb-12">
        <SectionLabel>England & Wales</SectionLabel>
        <SectionHeading>Market standard UK position</SectionHeading>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="divide-y divide-zinc-800">
            {guide.marketStandard.map((item, i) => (
              <MarketStandardItem key={i} text={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Ask your lawyer ── */}
      <section className="mb-12">
        <SectionLabel>Legal advice triggers</SectionLabel>
        <SectionHeading>Ask your lawyer if…</SectionHeading>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
          <div className="divide-y divide-zinc-800">
            {guide.askYourLawyer.map((q, i) => (
              <LawyerQuestionItem key={i} text={q} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="mb-16 rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
        <h2 className="mb-2 text-base font-semibold text-zinc-100">
          Ready to check your contract?
        </h2>
        <p className="mb-5 text-sm text-zinc-400">
          Upload your contract to Pactora and we will flag {guide.clauseName.toLowerCase()} issues instantly — alongside all other key clauses.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
          >
            Upload a contract to Pactora
            <ArrowRightIcon />
          </Link>
          <Link
            href="/templates"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-400 hover:text-zinc-100"
          >
            Download our free {guide.relatedTemplateName}
          </Link>
        </div>
      </section>

      {/* ── Related clauses ── */}
      <section>
        <SectionLabel>Further reading</SectionLabel>
        <h2 className="mb-4 text-base font-semibold text-zinc-100">
          Related clause guides
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {otherGuides.map((g) => (
            <Link
              key={g.slug}
              href={`/clauses/${g.slug}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-600 hover:bg-zinc-900"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white">
                  {g.clauseName}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">
                  {g.heroSummary}
                </p>
              </div>
              <ArrowRightIcon />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
