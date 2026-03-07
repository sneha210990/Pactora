import { getOperatorSummary } from '@/lib/beta-store';

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

  const summary = await getOperatorSummary();

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Beta operator summary</h1>
        <p className="text-sm text-zinc-400">
          Users: {summary.totals.users} · Uploads: {summary.totals.uploads} · Feedback: {summary.totals.feedback} · Events: {summary.totals.events}
        </p>

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
