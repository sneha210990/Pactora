"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type DealCtx = {
  acv: number;
  termMonths: number;
  insuranceCover?: number;
  currency: string;
  side?: string;
  contractType?: string;
  law?: string;
  dataType?: string;
  riskTolerance?: number; // 1–5
};

function money(n: number, currency: string) {
  const symbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
  return `${symbol}${Math.round(n).toLocaleString()}`;
}

function extractCapSignals(text: string) {
  const t = text.toLowerCase();

  const uncapped =
    t.includes("unlimited") ||
    t.includes("uncapped") ||
    t.includes("no limit") ||
    t.includes("without limit");

  // crude detectors for “cap = fees paid in last 12 months” and multipliers
  const referencesFees =
    t.includes("fees paid") ||
    t.includes("fees payable") ||
    t.includes("charges paid") ||
    t.includes("amounts paid") ||
    t.includes("subscription fees");

  const multipleMatch = t.match(/(\d+)\s*x\s*(fees|charges|subscription)/i);
  const multiple = multipleMatch ? Number(multipleMatch[1]) : null;

  // explicit monetary cap e.g. "£100,000" or "100,000 pounds"
  const currencyCapMatch = t.match(/£\s?(\d[\d,]*)/);
  const gbpCap = currencyCapMatch ? Number(currencyCapMatch[1].replace(/,/g, "")) : null;

  return { uncapped, referencesFees, multiple, gbpCap };
}

function detectCarveouts(text: string) {
  const t = text.toLowerCase();
  const carveouts: string[] = [];

  // very common carve-outs to flag as “watch this”
  if (t.includes("data protection") || t.includes("gdpr")) carveouts.push("Data protection / GDPR carve-out");
  if (t.includes("confidential") || t.includes("confidentiality")) carveouts.push("Confidentiality carve-out");
  if (t.includes("intellectual property") || t.includes("ip infringement") || t.includes("infringement"))
    carveouts.push("IP infringement carve-out");
  if (t.includes("fraud")) carveouts.push("Fraud carve-out");
  if (t.includes("death") || t.includes("personal injury")) carveouts.push("Death / personal injury carve-out");

  // signals for “cap carve-outs are uncapped”
  const uncappedSignals =
    t.includes("shall not apply") ||
    t.includes("does not apply") ||
    t.includes("excluded from") ||
    t.includes("not subject to") ||
    t.includes("without limitation");

  const looksUncappedCarveouts = carveouts.length > 0 && uncappedSignals;

  return { carveouts, looksUncappedCarveouts };
}

function buildFallbackLadder(ctx: DealCtx) {
  // Vendor-friendly defaults for UK SaaS.
  // Later we’ll tune by riskTolerance/side.
  const acv = ctx.acv || 0;

  const ideal = acv; // 100% ACV
  const fallback1 = Math.round(acv * 1.5); // 150% ACV
  const fallback2 = Math.round(acv * 2.0); // 200% ACV

  return { ideal, fallback1, fallback2 };
}

function assessCommercialReasonableness(ctx: DealCtx, signals: ReturnType<typeof extractCapSignals>) {
  const acv = ctx.acv || 0;

  // Determine “implied cap” for demo scoring
  let impliedCap: number | null = null;
  let basis = "Unclear";

  if (signals.uncapped) {
    return {
      label: "Red flag",
      note: "Clause appears uncapped / unlimited.",
      impliedCap,
      basis: "Uncapped",
      band: "high" as const,
    };
  }

  if (signals.gbpCap != null && ctx.currency === "GBP") {
    impliedCap = signals.gbpCap;
    basis = "Explicit amount";
  } else if (signals.multiple != null && signals.referencesFees) {
    // assume fees ~ ACV for demo (later: term + billing)
    impliedCap = Math.round(acv * signals.multiple);
    basis = `${signals.multiple}x fees (estimated vs ACV)`;
  } else if (signals.referencesFees) {
    impliedCap = acv; // interpret as ~1x ACV for demo
    basis = "Fees paid/payable (estimated ~1x ACV)";
  }

  if (!impliedCap || acv === 0) {
    return {
      label: "Needs review",
      note: "Cap wording is unclear (or ACV missing).",
      impliedCap,
      basis,
      band: "mid" as const,
    };
  }

  const ratio = impliedCap / acv;

  if (ratio <= 1) {
    return {
      label: "Firm but common",
      note: "Cap is around ≤1x ACV. Often market-standard for SaaS, but watch carve-outs.",
      impliedCap,
      basis,
      band: "mid" as const,
    };
  }

  if (ratio <= 2) {
    return {
      label: "Commercially acceptable",
      note: "Cap is in a reasonable range (between 1x–2x ACV).",
      impliedCap,
      basis,
      band: "low" as const,
    };
  }

  return {
    label: "Generous",
    note: "Cap is >2x ACV. This is generous; ensure it matches your insurance and appetite.",
    impliedCap,
    basis,
    band: "low" as const,
  };
}

export default function LolReviewPage() {
  const params = useSearchParams();

  const ctx: DealCtx = useMemo(
    () => ({
      dealName: params.get("dealName") || "",
      counterparty: params.get("counterparty") || "",
      side: params.get("side") || "",
      contractType: params.get("contractType") || "",
      currency: params.get("currency") || "GBP",
      acv: Number(params.get("acv") || 0),
      termMonths: Number(params.get("termMonths") || 12),
      law: params.get("law") || "",
      dataType: params.get("dataType") || "",
      riskTolerance: Number(params.get("riskTolerance") || 3),
    }),
    [params]
  ) as any;

  const [clauseText, setClauseText] = useState(
    "Supplier’s total liability in any contract year is limited to 1x the fees paid in the preceding 12 months. This limitation shall not apply to liability arising from breach of confidentiality, data protection obligations, or IP infringement."
  );

  const capSignals = useMemo(() => extractCapSignals(clauseText), [clauseText]);
  const carveoutSignals = useMemo(() => detectCarveouts(clauseText), [clauseText]);

  const commercial = useMemo(() => assessCommercialReasonableness(ctx, capSignals), [ctx, capSignals]);
  const ladder = useMemo(() => buildFallbackLadder(ctx), [ctx]);

  return (
    <main className="min-h-screen bg-black text-white px-6 py-14">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-semibold">Limitation of Liability</h1>
            <p className="text-zinc-400 mt-2 max-w-2xl">
              Paste the clause. Pactora answers: (1) is the cap commercially reasonable, (2) are there dangerous carve-outs,
              (3) what’s your negotiation fallback.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-4">
            <div className="text-sm text-zinc-400">Deal context</div>
            <div className="text-sm text-zinc-300 mt-2 space-y-1">
              <div>
                <span className="text-zinc-500">ACV:</span> {money(ctx.acv || 0, ctx.currency)}
              </div>
              <div>
                <span className="text-zinc-500">Term:</span> {ctx.termMonths} months
              </div>
              <div>
                <span className="text-zinc-500">Data:</span> {ctx.dataType || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Clause input */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-lg font-semibold mb-4">Clause text</h2>
            <textarea
              value={clauseText}
              onChange={(e) => setClauseText(e.target.value)}
              rows={14}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-zinc-600"
            />
            <p className="text-xs text-zinc-500 mt-3">
              Try adding “unlimited liability” or “cap is £100,000” and watch the outputs update.
            </p>
          </section>

          {/* Outputs */}
          <div className="space-y-8">
            {/* Commercial reasonableness */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-lg font-semibold mb-2">1) Commercial reasonableness</h2>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-bold">{commercial.label}</div>
                  <div className="text-sm text-zinc-400 mt-1">{commercial.note}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-zinc-500">Implied cap</div>
                  <div className="text-lg font-semibold">
                    {commercial.impliedCap ? money(commercial.impliedCap, ctx.currency) : "—"}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">{commercial.basis}</div>
                </div>
              </div>
            </section>

            {/* Carve-outs */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-lg font-semibold mb-2">2) Carve-outs to watch</h2>

              {carveoutSignals.carveouts.length === 0 ? (
                <p className="text-sm text-zinc-400">No obvious carve-outs detected (basic detection).</p>
              ) : (
                <div className="space-y-3">
                  <ul className="text-sm text-zinc-300 space-y-2">
                    {carveoutSignals.carveouts.map((c, idx) => (
                      <li key={idx}>• {c}</li>
                    ))}
                  </ul>

                  {carveoutSignals.looksUncappedCarveouts ? (
                    <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm">
                      <div className="font-semibold text-red-200">Potential red flag</div>
                      <div className="text-red-200/80 mt-1">
                        These carve-outs may be excluded from the cap (wording suggests “not subject to” / “does not apply”).
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-300">
                      Carve-outs detected. Next step is to confirm whether they are capped or uncapped.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Negotiation fallback ladder */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-lg font-semibold mb-2">3) Negotiation fallback ladder</h2>
              <p className="text-sm text-zinc-400 mb-5">
                Simple numbers you can use in negotiation. (Vendor-friendly defaults; we’ll tune later.)
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="text-xs text-zinc-500">Ideal</div>
                  <div className="text-lg font-semibold mt-1">{money(ladder.ideal, ctx.currency)}</div>
                  <div className="text-xs text-zinc-500 mt-1">~100% ACV</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="text-xs text-zinc-500">Fallback 1</div>
                  <div className="text-lg font-semibold mt-1">{money(ladder.fallback1, ctx.currency)}</div>
                  <div className="text-xs text-zinc-500 mt-1">~150% ACV</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <div className="text-xs text-zinc-500">Fallback 2</div>
                  <div className="text-lg font-semibold mt-1">{money(ladder.fallback2, ctx.currency)}</div>
                  <div className="text-xs text-zinc-500 mt-1">~200% ACV</div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 text-sm text-zinc-300">
                Founder-friendly script: “We can’t accept uncapped exposure. We can do a cap of{" "}
                <span className="font-semibold">{money(ladder.ideal, ctx.currency)}</span>. If that doesn’t work,{" "}
                <span className="font-semibold">{money(ladder.fallback1, ctx.currency)}</span> is the most we can stretch to.”
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}