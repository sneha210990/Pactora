import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  AUTHOR_ATTRIBUTION,
  CLAUSE_GUIDES,
  getClauseGuide,
  type ResourceLink,
} from '@/lib/clause-guide-content';

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

function BookIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-zinc-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.506 7.506 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-zinc-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-zinc-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 3a7 7 0 00-7 7v1.5A1.5 1.5 0 004.5 13H5a1 1 0 011 1v2.5a1.5 1.5 0 003 0V13a1 1 0 011-1h.5A1.5 1.5 0 0012 10.5V10a7 7 0 00-7-7zm0 1.5a5.5 5.5 0 015.5 5.5v.5h-.5A2.5 2.5 0 0012.5 13v2.5a3 3 0 01-5 0V13A2.5 2.5 0 005 10.5V10A5.5 5.5 0 0110 4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ScalesIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-zinc-400"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668.83.75.75 0 01-.336 1.461 31.28 31.28 0 00-1.103-.232l1.702 7.545a.75.75 0 01-.387.832A4.981 4.981 0 0115 14a4.98 4.98 0 01-2.29-.552.75.75 0 01-.387-.832l1.702-7.545a31.27 31.27 0 00-3.275-.542v11.216a6.52 6.52 0 012.655 1.557.75.75 0 11-1.06 1.06A5.002 5.002 0 0010 17.5a5 5 0 00-2.345.602.75.75 0 11-1.06-1.06 6.52 6.52 0 012.655-1.557V4.529a31.27 31.27 0 00-3.275.543l1.702 7.544a.75.75 0 01-.387.833A4.98 4.98 0 015 14a4.98 4.98 0 01-2.294-.553.75.75 0 01-.387-.832L4.02 5.07c-.37.07-.738.148-1.103.233a.75.75 0 01-.336-1.462 33.186 33.186 0 016.669-.829V2.75A.75.75 0 0110 2zM5 12.695l-1.197-5.308A3.5 3.5 0 016.803 12.5 3.506 3.506 0 015 12.695zm10 0a3.506 3.506 0 01-1.803-.195 3.5 3.5 0 013-5.308L15 12.695z"
        clipRule="evenodd"
      />
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

function ExternalLinkIcon() {
  return (
    <svg
      className="h-3 w-3 shrink-0 opacity-50"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 10L10 2M10 2H5M10 2V7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

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

function ResourceItem({
  icon,
  item,
}: {
  icon: React.ReactNode;
  item: ResourceLink;
}) {
  const inner = (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5">{icon}</div>
      <p className="text-sm leading-relaxed text-zinc-300">{item.text}</p>
      {item.url && (
        <div className="mt-1 ml-auto pl-3">
          <ExternalLinkIcon />
        </div>
      )}
    </div>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block transition-colors hover:bg-white/5 -mx-2 px-2 rounded-lg"
      >
        {inner}
      </a>
    );
  }

  return <div>{inner}</div>;
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
      <div className="mb-8">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Pactora Clause Guide
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
          {guide.clauseName}
        </h1>
        <p className="text-lg leading-relaxed text-zinc-400">{guide.heroSummary}</p>
      </div>

      {/* ── Author attribution ── */}
      <div className="mb-12 rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 py-4">
        <p className="text-xs leading-relaxed text-zinc-500">{AUTHOR_ATTRIBUTION}</p>
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
        <SectionLabel>For UK freelancers &amp; small businesses</SectionLabel>
        <SectionHeading>What reasonable looks like</SectionHeading>
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6">
          <ul className="space-y-3">
            {guide.whatReasonableLooksLike.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
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
        <SectionLabel>England &amp; Wales</SectionLabel>
        <SectionHeading>Market standard UK position</SectionHeading>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="divide-y divide-zinc-800/60">
            {guide.marketStandard.map((item, i) => (
              <div key={i} className="flex gap-3 py-2.5">
                <div className="mt-0.5"><CheckIcon /></div>
                <p className="text-sm leading-relaxed text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ask your lawyer ── */}
      <section className="mb-12">
        <SectionLabel>Legal advice triggers</SectionLabel>
        <SectionHeading>Ask your lawyer if&hellip;</SectionHeading>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-6">
          <div className="divide-y divide-zinc-800/60">
            {guide.askYourLawyer.map((q, i) => (
              <div key={i} className="flex gap-3 py-2.5">
                <div className="mt-0.5"><SolicitorIcon /></div>
                <p className="text-sm leading-relaxed text-zinc-300">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Resources ── */}
      <section className="mb-16 space-y-8">
        <div>
          <SectionLabel>References</SectionLabel>
          <SectionHeading>Legal sources</SectionHeading>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 divide-y divide-zinc-800/60">
            {guide.legalSources.map((src, i) => (
              <ResourceItem key={i} icon={<ScalesIcon />} item={src} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Read more</SectionLabel>
          <h2 className="mb-4 text-xl font-semibold text-zinc-100">Further reading</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 divide-y divide-zinc-800/60">
            {guide.furtherReading.map((item, i) => (
              <ResourceItem key={i} icon={<BookIcon />} item={item} />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <SectionLabel>Watch</SectionLabel>
            <h2 className="mb-4 text-base font-semibold text-zinc-100">Video</h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 divide-y divide-zinc-800/60">
              {guide.watch.map((item, i) => (
                <ResourceItem key={i} icon={<PlayIcon />} item={item} />
              ))}
            </div>
          </div>

          <div>
            <SectionLabel>Listen</SectionLabel>
            <h2 className="mb-4 text-base font-semibold text-zinc-100">Podcast</h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-5 divide-y divide-zinc-800/60">
              {guide.listen.map((item, i) => (
                <ResourceItem key={i} icon={<HeadphonesIcon />} item={item} />
              ))}
            </div>
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
        <Link
          href="/deals/new"
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white"
        >
          Upload a contract to Pactora
          <ArrowRightIcon />
        </Link>
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-200 group-hover:text-white">
                  {g.clauseName}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {g.heroSummary}
                </p>
              </div>
              <div className="shrink-0 text-zinc-500 group-hover:text-zinc-300">
                <ArrowRightIcon />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
