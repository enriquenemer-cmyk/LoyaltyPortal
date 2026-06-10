import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

async function ensurePushSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_phone TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensurePushSchema();

    const body = await req.json();
    const { endpoint, keys, phone } = body as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      phone?: string;
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    await getPool().query(
      `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_phone)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth,
         user_phone = COALESCE(EXCLUDED.user_phone, push_subscriptions.user_phone)`,
      [id, endpoint, keys.p256dh, keys.auth, phone ?? null]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body as { endpoint?: string };
    if (!endpoint) return NextResponse.json({ error: 'endpoint requerido' }, { status: 400 });

    await ensurePushSchema();
    await getPool().query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe DELETE] error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
