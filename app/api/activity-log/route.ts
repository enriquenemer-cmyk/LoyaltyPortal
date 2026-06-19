import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';
import type { ActivityLogEntry } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.username) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const action = searchParams.get('action');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10) || 100, 500);

    const pool = getPool();
    const { rows } = action
      ? await pool.query<ActivityLogEntry>(
          `SELECT * FROM activity_log WHERE action = $1 ORDER BY created_at DESC LIMIT $2`,
          [action, limit]
        )
      : await pool.query<ActivityLogEntry>(
          `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT $1`,
          [limit]
        );
    return NextResponse.json({ entries: rows });
  } catch (err) {
    console.error('Activity log error:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
