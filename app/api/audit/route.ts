import { NextResponse } from 'next/server';
import { getCurrentSessionUser } from '@/lib/auth';
import { getAuditEventsForUser } from '@/lib/beta-store';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const session = await getCurrentSessionUser();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const events = await getAuditEventsForUser(session.user.id, 200);

  if (format === 'csv') {
    const ACTION_LABELS: Record<string, string> = {
      contract_extracted: 'Contract uploaded',
      clause_analysed: 'Clauses analysed',
      redline_generated: 'Redline generated',
    };
    const rows = [
      'id,action,document,created_at',
      ...events.map((e) => {
        const fileName =
          e.metadata && typeof e.metadata === 'object' && 'file_name' in e.metadata
            ? String(e.metadata.file_name)
            : e.document_id ?? '';
        return [
          e.id,
          ACTION_LABELS[e.action] ?? e.action,
          `"${fileName.replace(/"/g, '""')}"`,
          e.created_at,
        ].join(',');
      }),
    ].join('\n');

    return new Response(rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="pactora-audit-log.csv"',
      },
    });
  }

  return NextResponse.json({ events });
}
