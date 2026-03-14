'use client';

import Link from 'next/link';
import { ChangeEvent, useState } from 'react';
import { trackEvent } from '@/components/track-event';

const DEFAULT_ACV = 25000;
const DEFAULT_TERM_MONTHS = 12;
const DEFAULT_INSURANCE_COVER = 1000000;

type DetectedContractValues = {
  acv: number | null;
  termMonths: number | null;
  insuranceCover: number | null;
  dataType: 'standard' | 'personal' | 'sensitive';
};

export default function NewDealPage() {
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [hasDetectedValues, setHasDetectedValues] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [hasAcceptedLegalNotice, setHasAcceptedLegalNotice] = useState<boolean>(false);
  const [hasConfirmedDataCaution, setHasConfirmedDataCaution] = useState<boolean>(false);
  const [acv, setAcv] = useState<number>(DEFAULT_ACV);
  const [termMonths, setTermMonths] = useState<number>(DEFAULT_TERM_MONTHS);
  const [insuranceCover, setInsuranceCover] = useState<number>(DEFAULT_INSURANCE_COVER);
  const [dataType, setDataType] = useState<DetectedContractValues['dataType']>('standard');

  const applyDetectedValues = (detectedValues: DetectedContractValues) => {
    setAcv(detectedValues.acv ?? DEFAULT_ACV);
    setTermMonths(detectedValues.termMonths ?? DEFAULT_TERM_MONTHS);
    setInsuranceCover(detectedValues.insuranceCover ?? DEFAULT_INSURANCE_COVER);
    setDataType(detectedValues.dataType);
  };

  const handleContractUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setSelectedFileName('');
      setHasDetectedValues(false);
      setUploadError(null);
      return;
    }

    setUploadError(null);
    setSelectedFileName(file.name);
    trackEvent('contract_upload_started', '/deals/new');

    try {
      const formData = new FormData();
      formData.append('contract', file);

      const response = await fetch('/api/contracts/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Could not extract contract values.');
      }

      const payload: { detectedValues: DetectedContractValues } = await response.json();
      applyDetectedValues(payload.detectedValues);
      setHasDetectedValues(true);
      trackEvent('contract_uploaded', '/deals/new');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not extract contract values.';
      setUploadError(message);
      applyDetectedValues({
        acv: null,
        termMonths: null,
        insuranceCover: null,
        dataType: 'standard',
      });
      setHasDetectedValues(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">New Deal Intake</h1>
          <p className="max-w-2xl text-sm text-zinc-400">
            Upload your draft contract, confirm the extracted commercial context, then continue to
            Liability review.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
          <ol className="grid gap-3 text-sm text-zinc-300 md:grid-cols-4">
            <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Stage 1</p>
              <p className="mt-1 font-medium text-white">Upload contract</p>
            </li>
            <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Stage 2</p>
              <p className="mt-1 font-medium text-white">Confirm deal context</p>
            </li>
            <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Stage 3</p>
              <p className="mt-1 font-medium text-white">Acknowledgement</p>
            </li>
            <li className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Stage 4</p>
              <p className="mt-1 font-medium text-white">Continue to liability review</p>
            </li>
          </ol>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Stage 1</p>
          <h2 className="text-lg font-medium text-white">Upload contract</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Upload your contract and Pactora will process it to extract key commercial terms and generate structured review outputs.
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
            {uploadError ? (
              <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {uploadError}
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-2 text-xs text-zinc-500">
            <p>
              Please avoid uploading unnecessary personal data or special category data where
              possible.
            </p>
            <p>Detected values are suggestions and can be edited.</p>
            <p>
              In this beta, uploaded content is not used to train public foundation models.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Stage 2</p>
              <h2 className="text-lg font-medium text-white">Confirm deal context</h2>
            </div>
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
                onChange={(event) => setDataType(event.target.value as DetectedContractValues['dataType'])}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-zinc-600"
              >
                <option value="standard">Standard</option>
                <option value="personal">Personal data</option>
                <option value="sensitive">Special category</option>
              </select>
            </div>

            <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-300">Stage 3</p>
              <h3 className="mt-1 text-sm font-semibold uppercase tracking-wide text-amber-200">Acknowledgement</h3>

              <div className="mt-4 rounded-xl border border-amber-700/50 bg-amber-950/30 p-4 text-sm">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-amber-200">Legal notice</h4>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-200">
                  <li>Pactora provides decision-support software for commercial contract review.</li>
                  <li>Pactora does not provide legal advice or create a lawyer-client relationship.</li>
                  <li>Outputs may be incomplete or inaccurate and should be validated.</li>
                  <li>Use qualified human and legal review where appropriate before material decisions.</li>
                  <li>You must be authorised to upload the document and its contents.</li>
                </ul>
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

              <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 rounded-lg border border-zinc-700 bg-zinc-900/70 p-4 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    required
                    checked={hasAcceptedLegalNotice}
                    onChange={(event) => setHasAcceptedLegalNotice(event.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-white"
                  />
                  <span>
                    I confirm that I am authorised to upload this material, that I understand Pactora is
                    decision-support software and not legal advice, and that outputs may be incomplete or
                    inaccurate and require appropriate human/legal review.
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
              </div>
            </div>

            <button
              type="submit"
              disabled={!hasAcceptedLegalNotice || !hasConfirmedDataCaution}
              className="w-full rounded-lg bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
            >
              Continue to Liability Review
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
