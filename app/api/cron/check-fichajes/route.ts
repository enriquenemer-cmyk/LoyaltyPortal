import { NextRequest, NextResponse } from 'next/server';
import { getPool, createNotification } from '@/lib/db';

export const runtime = 'nodejs';

function isCronAuthorized(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true;
  const bearer = req.headers.get('authorization');
  if (bearer === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

// Called once daily via Vercel Cron. Detects fichajes clocked in more than
// 16h ago with no clock_out (same threshold as the anomaly banner in
// /admin/fichajes) and raises one bell notification per open entry — using
// the notification's `link` as an idempotency key so the same forgotten
// entry never notifies twice.
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = getPool();
  const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000);

  const { rows: openEntries } = await pool.query<{
    id: string;
    full_name: string;
    clock_in: string;
  }>(
    `SELECT tce.id, e.full_name, tce.clock_in
     FROM time_clock_entries tce
     JOIN employees e ON e.id = tce.employee_id
     WHERE tce.clock_out IS NULL AND tce.clock_in <= $1`,
    [sixteenHoursAgo.toISOString()]
  );

  let created = 0;
  for (const entry of openEntries) {
    const link = `/admin/fichajes?entry=${entry.id}`;
    const { rows: existing } = await pool.query(
      `SELECT 1 FROM notifications WHERE link = $1 LIMIT 1`,
      [link]
    );
    if (existing.length > 0) continue;

    const hours = Math.floor((Date.now() - new Date(entry.clock_in).getTime()) / 3600000);
    await createNotification({
      type: 'forgotten_clock_out',
      title: 'Turno olvidado sin marcar salida',
      body: `${entry.full_name} sigue fichado desde hace ${hours}h sin marcar salida.`,
      link,
    });
    created++;
  }

  return NextResponse.json({ checked: openEntries.length, notified: created });
}
