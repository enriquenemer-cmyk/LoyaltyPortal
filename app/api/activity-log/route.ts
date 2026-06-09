import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';
import type { ActivityLogEntry } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.username) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const pool = getPool();
    const { rows } = await pool.query<ActivityLogEntry>(
      `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100`
    );
    return NextResponse.json({ entries: rows });
  } catch (err) {
    console.error('Activity log error:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
