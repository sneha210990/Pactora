'use client';

import Link from 'next/link';
import { ChangeEvent, useState } from 'react';
import { trackEvent } from '@/components/track-event';

export default function NewDealPage() {
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [hasDetectedValues, setHasDetectedValues] = useState<boolean>(false);
  const [hasAcceptedLegalNotice, setHasAcceptedLegalNotice] = useState<boolean>(false);
  const [hasConfirmedDataCaution, setHasConfirmedDataCaution] = useState<boolean>(false);
  const [acv, setAcv] = useState<number>(0);
  const [termMonths, setTermMonths] = useState<number>(0);
  const [insuranceCover, setInsuranceCover] = useState<number>(0);
  const [dataType, setDataType] = useState<string>('standard');


  const handleContractUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFileName('');
      setHasDetectedValues(false);
      return;
    }

    setSelectedFileName(file.name);
    trackEvent('contract_upload_started', '/deals/new');

    // Simulated contract extraction (v0)
    setAcv(25000);
    setTermMonths(12);
    setInsuranceCover(1000000);
    setDataType('standard');
    setHasDetectedValues(true);
    trackEvent('contract_uploaded', '/deals/new');
  };

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">New Deal Intake</h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            Upload your draft contract, confirm the extracted commercial context, then continue to
            Letter of Liability review.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <h2 className="text-lg font-medium text-white">Upload contract</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Upload your contract and Pactora will detect key commercial terms.
          </p>

          <div className="mt-5">
            <label
              htmlFor="contractUpload"
              className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400"
            >
              Contract file (.pdf or .docx)
            </label>
            <input
              id="contractUpload"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleContractUpload}
              className="block w-full cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-zinc-200"
            />
            {selectedFileName ? (
              <p className="mt-3 text-sm text-zinc-300">
                Selected file: <span className="font-medium text-white">{selectedFileName}</span>
              </p>
            ) : null}
          </div>

          <p className="mt-5 text-xs text-zinc-500">
            Contract upload parsing is v0 — you can still edit any detected values before
            continuing.
          </p>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium text-white">Deal context</h2>
            {hasDetectedValues ? (
              <span className="rounded-full border border-emerald-700/70 bg-emerald-950 px-3 py-1 text-xs font-medium text-emerald-300">
                Detected from contract (editable)
              </span>
            ) : (
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-medium text-zinc-400">
                Manual entry
              </span>
            )}
          </div>

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
                onChange={(event) => setAcv(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-zinc-600"
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
                onChange={(event) => setTermMonths(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-zinc-600"
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
                onChange={(event) => setInsuranceCover(Number(event.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-zinc-600"
              />
            </div>

            <div>
              <label htmlFor="dataType" className="mb-2 block text-sm text-zinc-300">
                Data type
              </label>
              <select
                id="dataType"
                name="dataType"
                value={dataType}
                onChange={(event) => setDataType(event.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-zinc-600"
              >
                <option value="standard">Standard</option>
                <option value="personal">Personal data</option>
                <option value="sensitive">Special category</option>
              </select>
            </div>

            <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-200">Legal notice</h3>
              <p className="mt-3 text-zinc-200">
                Pactora is a beta contract review and decision-support tool operated by Sneha Sindhu
                Ganapavarapu. It is not a law firm and does not provide legal advice. Please upload
                only documents you are authorised to use. Avoid unnecessary personal data or special
                category data where possible. Uploaded content may be processed to extract terms,
                generate risk-related outputs, support operation of the Service, maintain security, and
                improve Pactora in controlled, de-identified, aggregated, or limited forms, subject to
                the Privacy Notice.
              </p>
              <p className="mt-4 text-zinc-300">
                Read our{' '}
                <Link href="/terms" className="text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-100">
                  Terms
                </Link>{' '}
                ,{' '}
                <Link href="/privacy" className="text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-100">
                  Privacy Notice
                </Link>{' '}
                ,{' '}
                <Link href="/security" className="text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-100">
                  Security
                </Link>{' '}
                and{' '}
                <Link href="/subprocessors" className="text-amber-200 underline decoration-amber-400/60 underline-offset-4 hover:text-amber-100">
                  Subprocessors
                </Link>
                .
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-200">
              <input
                type="checkbox"
                required
                checked={hasAcceptedLegalNotice}
                onChange={(event) => setHasAcceptedLegalNotice(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-white"
              />
              <span>
                I confirm that I am authorised to upload this material, that I understand Pactora is a
                beta decision-support tool and not a provider of legal advice, and that any outputs
                must be reviewed by an appropriately qualified human before material decisions are
                made.
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-200">
              <input
                type="checkbox"
                required
                checked={hasConfirmedDataCaution}
                onChange={(event) => setHasConfirmedDataCaution(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-white"
              />
              <span>
                I confirm that, to the best of my knowledge, this upload does not include unnecessary
                personal data or special category data, and that any such data included is being
                uploaded lawfully and with appropriate authority.
              </span>
            </label>

            <button
              type="submit"
              onClick={() => trackEvent('analysis_started', '/review/lol')}
              disabled={!hasAcceptedLegalNotice || !hasConfirmedDataCaution}
              className="w-full rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
            >
              Continue to LoL Review
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
