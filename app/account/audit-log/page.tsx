import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSessionUser } from '@/lib/auth';
import { getAuditEventsForUser } from '@/lib/beta-store';

export const dynamic = 'force-dynamic';

const ACTION_LABELS: Record<string, string> = {
  contract_extracted: 'Contract uploaded',
  clause_analysed: 'Clauses analysed',
  redline_generated: 'Redline generated',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function actionBadgeClass(action: string) {
  if (action === 'contract_extracted') return 'border-blue-500/40 bg-blue-500/10 text-blue-300';
  if (action === 'clause_analysed') return 'border-violet-500/40 bg-violet-500/10 text-violet-300';
  return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
}

export default async function AuditLogPage() {
  const session = await getCurrentSessionUser();
  if (!session) redirect('/login');

  const events = await getAuditEventsForUser(session.user.id, 200);

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-center justify-between">
          <Link href="/deals" className="text-sm text-zinc-400 hover:text-zinc-200">
            ← Back to deals
          </Link>
          {events.length > 0 && (
            <a
              href="/api/audit?format=csv"
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-900"
            >
              Download CSV
            </a>
          )}
        </div>

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Audit log</h1>
          <p className="mt-2 text-sm text-zinc-400">
            A record of every contract upload and analysis you have run on Pactora.
            Records are immutable and cannot be edited or deleted.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-8 py-16 text-center">
            <p className="text-zinc-400">No activity recorded yet.</p>
            <Link
              href="/deals/new"
              className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
            >
              + New review
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            <table className="min-w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Action</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Document</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/50">
                {events.map((event) => {
                  const fileName =
                    event.metadata && typeof event.metadata === 'object' && 'file_name' in event.metadata
                      ? String(event.metadata.file_name)
                      : event.document_id ?? '—';
                  return (
                    <tr key={event.id} className="hover:bg-zinc-900/40">
                      <td className="px-5 py-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${actionBadgeClass(event.action)}`}>
                          {ACTION_LABELS[event.action] ?? event.action}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-5 py-3 text-zinc-300">{fileName}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-zinc-400">{formatDate(event.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-3 text-xs text-zinc-600">
              {events.length} event{events.length !== 1 ? 's' : ''} — showing most recent 200
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
