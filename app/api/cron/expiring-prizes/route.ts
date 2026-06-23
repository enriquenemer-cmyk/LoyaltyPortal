import { NextRequest, NextResponse } from 'next/server';
import { getPool, createNotification } from '@/lib/db';

// Called daily via cron (e.g. Vercel Cron or external scheduler).
// CRON_SECRET env var protects this endpoint.
export async function GET(req: NextRequest) {
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const authorized =
    !process.env.CRON_SECRET ||
    bearer === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET;
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { rows: expiring } = await getPool().query<{
    claim_id: string;
    full_name: string;
    phone: string;
    prize_name: string;
    end_date: string;
  }>(
    `SELECT c.id as claim_id, c.full_name, c.phone, p.name as prize_name, p.end_date
     FROM claims c JOIN prizes p ON c.prize_id = p.id
     WHERE c.status = 'pending' AND p.cancelled = false
       AND p.end_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'`
  );

  if (expiring.length === 0) {
    return NextResponse.json({ processed: 0, expiring: [] });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://premia-tierra.vercel.app';

  for (const row of expiring) {
    try {
      await createNotification({
        type: 'prize_expiring',
        title: 'Premio por vencer',
        body: `${row.full_name} tiene "${row.prize_name}" sin canjear, vence el ${row.end_date}`,
        link: '/admin/premios',
      });

      fetch(`${baseUrl}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: row.phone,
          title: 'Premio por vencer',
          body: `${row.full_name} tiene "${row.prize_name}" sin canjear, vence el ${row.end_date}`,
          url: '/admin/premios',
        }),
      }).catch(() => {});
    } catch {
      // Log and continue — don't let one failure block the rest
    }
  }

  return NextResponse.json({ processed: expiring.length, expiring });
}
