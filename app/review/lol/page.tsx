'use client';

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-400">Loading…</div>}>
      <LolInner />
    </Suspense>
  );
}

function LolInner() {
  const searchParams = useSearchParams();

  // Example: read something like ?acv=25000
  const acv = searchParams.get("acv");

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-4">Limitation of Liability Review</h1>

      <p className="text-zinc-300">
        ACV from URL (optional): <span className="font-mono">{acv ?? "—"}</span>
      </p>

      {/* Put your existing LoL UI below this line */}
    </main>
  );
}