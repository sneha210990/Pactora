import { getOperatorSummary, getApiUsageSummary } from '@/lib/beta-store';

export default async function OperatorBetaPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const operatorKey = process.env.PACTORA_OPERATOR_KEY;

  if (!operatorKey || key !== operatorKey) {
    return (
      <main className="min-h-screen bg-black px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-2xl font-semibold">Operator view locked</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Set <code>PACTORA_OPERATOR_KEY</code> and open this page with <code>?key=...</code>.
          </p>
        </div>
      </main>
    );
  }

  const [summary, apiUsage] = await Promise.all([getOperatorSummary(), getApiUsageSummary()]);

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Beta operator summary</h1>
        <p className="text-sm text-zinc-400">
          Users: {summary.totals.users} · Uploads: {summary.totals.uploads} · Feedback: {summary.totals.feedback} · Events: {summary.totals.events}
        </p>

        {/* API cost panel */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-lg font-semibold">Anthropic API usage</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-500">Total spend</p>
              <p className="mt-1 text-2xl font-semibold">${apiUsage.totalCostUsd.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Last 30 days</p>
              <p className="mt-1 text-2xl font-semibold">${apiUsage.last30DaysCostUsd.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Contracts processed</p>
              <p className="mt-1 text-2xl font-semibold">{apiUsage.contractsProcessed}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Avg cost / contract</p>
              <p className="mt-1 text-2xl font-semibold">${apiUsage.avgCostPerContractUsd.toFixed(4)}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-zinc-500">Extraction (Haiku)</p>
              <p className="mt-1 text-sm font-medium">${apiUsage.extractionCostUsd.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Clause analysis (Sonnet)</p>
              <p className="mt-1 text-sm font-medium">${apiUsage.analysisCostUsd.toFixed(4)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Input tokens</p>
              <p className="mt-1 text-sm font-medium">{apiUsage.totalInputTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Cache reads (saved)</p>
              <p className="mt-1 text-sm font-medium">{apiUsage.totalCacheReadTokens.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-400">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Sign-up</th>
                <th className="px-4 py-3">Last active</th>
                <th className="px-4 py-3">Uploaded?</th>
                <th className="px-4 py-3">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {summary.users.map((user) => (
                <tr key={user.id} className="border-b border-zinc-900/60">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.full_name ?? '—'}</td>
                  <td className="px-4 py-3">{user.company ?? '—'}</td>
                  <td className="px-4 py-3">{user.role ?? '—'}</td>
                  <td className="px-4 py-3">{new Date(user.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{new Date(user.last_active_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{user.has_uploaded_contract ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3">{user.feedback_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
