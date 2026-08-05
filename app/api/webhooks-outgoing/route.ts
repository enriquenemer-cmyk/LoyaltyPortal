import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { randomUUID, createHmac } from 'crypto';

async function requireAdmin() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM outgoing_webhooks ORDER BY created_at DESC');
  return NextResponse.json({ webhooks: rows });
}

export async function POST(req: NextRequest) {
  const pool = getPool();
  const body = await req.json() as {
    action?: 'create' | 'delete' | 'test';
    id?: string;
    name?: string;
    url?: string;
    events?: string[];
    secret?: string;
  };

  if (body.action === 'delete') {
    if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    await pool.query('DELETE FROM outgoing_webhooks WHERE id = $1', [body.id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'test') {
    if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    const { rows } = await pool.query('SELECT * FROM outgoing_webhooks WHERE id = $1', [body.id]);
    const wh = rows[0];
    if (!wh) return NextResponse.json({ error: 'Webhook no encontrado.' }, { status: 404 });
    const payload = JSON.stringify({ event: 'test', timestamp: new Date().toISOString(), data: { message: 'Test desde 3E' } });
    const sig = wh.secret ? createHmac('sha256', wh.secret).update(payload).digest('hex') : null;
    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(sig ? { 'X-ST-Signature': sig } : {}) },
        body: payload,
      });
      await pool.query('UPDATE outgoing_webhooks SET last_triggered_at = NOW() WHERE id = $1', [wh.id]);
      return NextResponse.json({ ok: res.ok, status: res.status });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) });
    }
  }

  if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  if (!body.name || !body.url) return NextResponse.json({ error: 'name y url requeridos.' }, { status: 400 });

  const { rows } = await pool.query(
    `INSERT INTO outgoing_webhooks (id, name, url, events, secret)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [randomUUID(), body.name, body.url, body.events ?? [], body.secret ?? null]
  );
  return NextResponse.json({ webhook: rows[0] }, { status: 201 });
}
