import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const resolved = body.resolved === true;

  try {
    const { rows } = await getPool().query(
      `UPDATE fraud_alerts SET resolved = $1 WHERE id = $2 RETURNING *`,
      [resolved, id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Alerta no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ alert: rows[0] });
  } catch (err) {
    console.error('[/api/admin/fraud-alerts/[id]] PATCH', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
