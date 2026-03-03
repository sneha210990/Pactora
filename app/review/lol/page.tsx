'use client';
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

function num(v: string | string[] | undefined, fallback = 0) {
  const s = Array.isArray(v) ? v[0] : v;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function str(v: string | string[] | undefined, fallback = "") {
  const s = Array.isArray(v) ? v[0] : v;
  return (s ?? fallback).toString();
}

function money(n: number) {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `£${Math.round(n)}`;
  }
}

export default function LolReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const acv = num(searchParams.acv, 25000);
  const termMonths = num(searchParams.termMonths, 12);
  const insuranceCover = num(searchParams.insuranceCover, 1000000);
  const dataType = str(searchParams.dataType, "standard");

  // Demo assumptions for now (later: replace with real extracted values)
  const cap = acv; // "1x ACV" style
  const capMultiple = acv > 0 ? (cap / acv).toFixed(1) : "—";

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-300 hover:text-white">
            Pactora
          </Link>
          <div className="flex gap-3">
            <Link
              href="/deals/new"
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              New Deal
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="mt-10">
          <h1 className="text-4xl font-semibold tracking-tight">
            Limitation of Liability Review
          </h1>
          <p className="mt-2 text-zinc-400">
            A plain-English view of exposure + practical negotiation fallbacks.
          </p>

          {/* Context chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              ACV: {money(acv)}
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              Term: {termMonths} months
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              Insurance: {money(insuranceCover)}
            </span>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-200">
              Data: {dataType}
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Summary */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Overall view</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  This is a demo output (we’ll wire contract upload + extraction
                  later).
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                Firm but common
              </span>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Cap (assumed)</span>
                <span className="font-medium">
                  {money(cap)} (~{capMultiple}× ACV)
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Practical exposure</span>
                <span className="font-medium">Medium</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Negotiation priority</span>
                <span className="font-medium">Only if carve-outs are wide</span>
              </div>
            </div>
          </div>

          {/* Carve-outs warning */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5">
            <h2 className="text-lg font-semibold">Carve-outs to watch</h2>
            <p className="mt-1 text-sm text-zinc-400">
              These can quietly make your “cap” meaningless.
            </p>

            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Data protection / GDPR indemnities (often uncapped)",
                "Confidentiality breaches (sometimes uncapped)",
                "IP infringement (may sit outside cap)",
                "Gross negligence / wilful misconduct (broad definitions)",
              ].map((x) => (
                <li
                  key={x}
                  className="flex gap-3 rounded-lg border border-zinc-800 bg-black/30 p-3"
                >
                  <span className="mt-0.5 text-amber-300">⚠</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg border border-zinc-800 bg-black/30 p-3 text-sm text-zinc-300">
              If the clause says{" "}
              <span className="text-white">
                “cap does not apply to …”
              </span>{" "}
              you should treat those items as{" "}
              <span className="text-white">uncapped exposure</span>.
            </div>
          </div>

          {/* Fallback ladder */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-5 md:col-span-2">
            <h2 className="text-lg font-semibold">Negotiation fallbacks</h2>
            <p className="mt-1 text-sm text-zinc-400">
              A simple ladder a founder can actually use on a call.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Ask</div>
                <div className="mt-1 font-medium">Cap at 1× ACV</div>
                <div className="mt-2 text-zinc-300">
                  “We can’t accept uncapped exposure. We can do a cap of{" "}
                  {money(acv)}.”
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Fallback</div>
                <div className="mt-1 font-medium">Cap at 1.5× ACV</div>
                <div className="mt-2 text-zinc-300">
                  “If that doesn’t work, we can stretch to{" "}
                  {money(Math.round(acv * 1.5))}.”
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                <div className="text-xs text-zinc-400">Structure</div>
                <div className="mt-1 font-medium">Carve-outs must be narrow</div>
                <div className="mt-2 text-zinc-300">
                  “We’ll accept carve-outs only for fraud and deliberate
                  misconduct — not broad categories like ‘data’.”
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/deals/new"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
              >
                Back to New Deal
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                Back to Landing
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-zinc-500">
          Next: we’ll replace demo assumptions with extracted clause text + real
          scoring logic.
        </p>
      </div>
    </main>
  );
}
}