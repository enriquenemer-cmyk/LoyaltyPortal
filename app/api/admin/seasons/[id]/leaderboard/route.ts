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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await ensureSchema();
    const { rows } = await getPool().query(
      `SELECT sp.phone, sp.season_points,
              (SELECT full_name FROM claims c WHERE c.phone = sp.phone ORDER BY c.claimed_at DESC LIMIT 1) AS full_name
       FROM season_progress sp
       WHERE sp.season_id = $1
       ORDER BY sp.season_points DESC
       LIMIT 3`,
      [id]
    );

    return NextResponse.json({ leaderboard: rows });
  } catch (err) {
    console.error('[/api/admin/seasons/[id]/leaderboard]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
