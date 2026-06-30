import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool, ensureSchema } from '@/lib/db';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ alerts: [] }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const resolvedParam = searchParams.get('resolved');
  const onlyUnresolved = resolvedParam !== 'true' && resolvedParam !== 'all';

  await ensureSchema();
  const pool = getPool();

  try {
    const { rows } = await pool.query(
      `SELECT fa.*, r.name as restaurant_name
       FROM fraud_alerts fa
       LEFT JOIN restaurants r ON r.id = fa.restaurant_id
       ${onlyUnresolved ? 'WHERE fa.resolved = false' : ''}
       ORDER BY
         CASE fa.severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
         fa.created_at DESC`
    );
    return NextResponse.json({ alerts: rows });
  } catch (err) {
    console.error('[/api/admin/fraud-alerts]', err);
    return NextResponse.json({ alerts: [] }, { status: 500 });
  }
}
