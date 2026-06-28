import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Authorized either by an admin session (manual use) or the shared
// CRON_SECRET used by server-to-server callers (automation/inactive,
// prizes/birthday, cron/expiring-prizes) — this endpoint can blast a push
// notification to every subscriber, so it must not be left open to the public.
async function isAuthorized(req: NextRequest): Promise<boolean> {
  const session = await getSession();
  if (session.username) return true;
  if (!process.env.CRON_SECRET) return false;
  const internalSecret = req.headers.get('x-internal-secret');
  return internalSecret === process.env.CRON_SECRET;
}

export async function POST(req: NextRequest) {
  if (!await isAuthorized(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@supertierra.mx',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  try {
    const body = await req.json();
    const { phone, title, body: msgBody, url } = body as {
      phone?: string;
      title: string;
      body: string;
      url?: string;
    };

    if (!title || !msgBody) {
      return NextResponse.json({ error: 'title y body son requeridos' }, { status: 400 });
    }

    // Query subscriptions
    let query: string;
    let params: unknown[];
    if (phone) {
      query = 'SELECT * FROM push_subscriptions WHERE user_phone = $1';
      params = [phone];
    } else {
      query = 'SELECT * FROM push_subscriptions';
      params = [];
    }

    const { rows } = await getPool().query<{
      endpoint: string;
      p256dh: string;
      auth: string;
    }>(query, params);

    if (rows.length === 0) {
      return NextResponse.json({ sent: 0, message: 'Sin suscriptores' });
    }

    const payload = JSON.stringify({
      title,
      body: msgBody,
      url: url ?? '/',
      icon: '/icon-192.png',
    });

    const results = await Promise.allSettled(
      rows.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    // Remove expired subscriptions (410 Gone)
    const expiredEndpoints: string[] = [];
    rows.forEach((sub, i) => {
      const r = results[i];
      if (r.status === 'rejected') {
        const err = r.reason as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await getPool().query(
        `DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])`,
        [expiredEndpoints]
      );
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.length - sent;

    return NextResponse.json({ sent, failed, total: rows.length });
  } catch (err) {
    console.error('[push/send] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
