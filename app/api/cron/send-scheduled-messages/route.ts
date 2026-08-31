import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { sendBroadcastEmail } from '@/lib/email';

type Recipient = { phone: string; email: string | null; full_name: string };

function isCronAuthorized(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true;
  const bearer = req.headers.get('authorization');
  if (bearer === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

async function getRecipients(targetType: string, inactiveDays: number | null): Promise<Recipient[]> {
  const pool = getPool();
  if (targetType === 'inactive' && inactiveDays) {
    const { rows } = await pool.query<Recipient>(
      `SELECT DISTINCT ON (phone) phone, email, full_name
       FROM claims
       WHERE phone NOT IN (
         SELECT DISTINCT phone FROM claims WHERE claimed_at >= NOW() - INTERVAL '1 day' * $1
       )
       ORDER BY phone, claimed_at DESC`,
      [inactiveDays]
    );
    return rows;
  }
  const { rows } = await pool.query<Recipient>(
    `SELECT DISTINCT ON (phone) phone, email, full_name FROM claims ORDER BY phone, claimed_at DESC`
  );
  return rows;
}

async function sendDueMessage(msg: {
  id: string;
  title: string;
  message: string;
  target_type: string;
  inactive_days: number | null;
  channels: string[];
}) {
  const pool = getPool();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://premia-tierra.vercel.app';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? appUrl;

  try {
    const recipients = await getRecipients(msg.target_type, msg.inactive_days);

    if (msg.channels.includes('push')) {
      if (msg.target_type === 'all') {
        await fetch(`${baseUrl}/api/push/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.CRON_SECRET ? { 'x-internal-secret': process.env.CRON_SECRET } : {}),
          },
          body: JSON.stringify({ title: msg.title, body: msg.message, url: '/mis-premios' }),
        }).catch(() => {});
      } else {
        await Promise.allSettled(
          recipients.map((r) =>
            fetch(`${baseUrl}/api/push/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(process.env.CRON_SECRET ? { 'x-internal-secret': process.env.CRON_SECRET } : {}),
              },
              body: JSON.stringify({ phone: r.phone, title: msg.title, body: msg.message, url: '/mis-premios' }),
            })
          )
        );
      }
    }

    if (msg.channels.includes('email')) {
      await Promise.allSettled(
        recipients
          .filter((r) => r.email)
          .map((r) => sendBroadcastEmail({ to: r.email!, full_name: r.full_name, title: msg.title, message: msg.message }))
      );
    }

    await pool.query(
      `UPDATE scheduled_messages SET status = 'sent', sent_count = $2, sent_at = NOW(), error = NULL WHERE id = $1`,
      [msg.id, recipients.length]
    );
  } catch (err) {
    console.error('[send-scheduled-messages] error for', msg.id, err);
    await pool.query(
      `UPDATE scheduled_messages SET status = 'failed', error = $2 WHERE id = $1`,
      [msg.id, err instanceof Error ? err.message : 'Error desconocido']
    );
  }
}

// Called periodically (e.g. hourly via Vercel Cron) to send any scheduled
// broadcast messages whose send_at has arrived. Each due message is sent
// at most once — status flips from 'pending' to 'sent'/'failed' immediately
// so a retriggered run never double-sends.
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { rows: due } = await getPool().query(
    `SELECT id, title, message, target_type, inactive_days, channels
     FROM scheduled_messages
     WHERE status = 'pending' AND send_at <= NOW()`
  );

  for (const msg of due) {
    await sendDueMessage(msg);
  }

  return NextResponse.json({ processed: due.length });
}
