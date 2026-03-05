'use client';

import { useState } from 'react';

export default function NewDealPage() {
  const [acv, setAcv] = useState<number>(25000);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [insuranceCover, setInsuranceCover] = useState<number>(100000);
  const [dataType, setDataType] = useState<string>('standard');

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-3xl font-semibold">New Deal</h1>
        <p className="mb-10 text-zinc-400">
          Set deal context so Pactora can score clause risk against commercial reality.
        </p>

        <form action="/review/lol" method="GET" className="space-y-6">
          <div>
            <label htmlFor="acv" className="mb-2 block text-sm text-zinc-300">
              ACV (£)
            </label>
            <input
              id="acv"
              name="acv"
              type="number"
              value={acv}
              onChange={(e) => setAcv(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="termMonths" className="mb-2 block text-sm text-zinc-300">
              Term (months)
            </label>
            <input
              id="termMonths"
              name="termMonths"
              type="number"
              value={termMonths}
              onChange={(e) => setTermMonths(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
            />
          </div>

          <div>
            <label htmlFor="insuranceCover" className="mb-2 block text-sm text-zinc-300">
              Insurance cover (£)
            </label>
            <input
              id="insuranceCover"
              name="insuranceCover"
              type="number"
              value={insuranceCover}
              onChange={(e) => setInsuranceCover(Number(e.target.value))}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
=======
            <label className="block text-sm text-zinc-300">Insurance cover (£)</label>
            <input
              name="insuranceCover"
              type="number"
              defaultValue={1000000}
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-white"
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)
            />
          </div>

          <div>
<<<<<<< HEAD
            <label htmlFor="dataType" className="mb-2 block text-sm text-zinc-300">
              Data type
            </label>
            <select
              id="dataType"
              name="dataType"
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
=======
            <label className="block text-sm text-zinc-300">Data type</label>
            <select
              name="dataType"
              defaultValue="standard"
              className="mt-2 w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-white"
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)
            >
              <option value="standard">Standard</option>
              <option value="personal">Personal data</option>
              <option value="sensitive">Special category</option>
            </select>
          </div>

          <button
            type="submit"
<<<<<<< HEAD
            className="w-full rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
=======
            className="mt-2 w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
>>>>>>> d787cbf (MVP: New Deal intake + LoL review flow working and deployed)
          >
            Start LoL Review
          </button>
        </form>
      </div>
    </main>
  );
}
