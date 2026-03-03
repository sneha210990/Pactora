"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewDealPage() {
  const router = useRouter();

  const [acv, setAcv] = useState<number>(25000);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [insuranceCover, setInsuranceCover] = useState<number>(100000);
  const [dataType, setDataType] = useState<string>("standard");

  const onContinue = () => {
    const params = new URLSearchParams({
      acv: String(acv),
      termMonths: String(termMonths),
      insuranceCover: String(insuranceCover),
      dataType,
    });
    router.push(`/review/lol?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">New Deal</h1>
        <p className="text-zinc-400 mb-10">
          Set deal context so Pactora can score clause risk against commercial reality.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm text-zinc-300 mb-2">ACV (£)</label>
            <input
              type="number"
              value={acv}
              onChange={(e) => setAcv(Number(e.target.value))}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-2">Term (months)</label>
            <input
              type="number"
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-2">Insurance cover (£)</label>
            <input
              type="number"
              value={insuranceCover}
              onChange={(e) => setInsuranceCover(Number(e.target.value))}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300 mb-2">Data type</label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3"
            >
              <option value="standard">Standard personal data</option>
              <option value="special">Special category data</option>
              <option value="none">No personal data</option>
            </select>
          </div>

          <button
            onClick={onContinue}
            className="w-full bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-zinc-200 transition"
          >
            Continue → Review Limitation of Liability
          </button>
        </div>
      </div>
    </main>
  );
}