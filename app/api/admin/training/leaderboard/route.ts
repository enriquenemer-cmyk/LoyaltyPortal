import { NextResponse } from 'next/server';
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

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT
         e.id, e.full_name, e.position, e.photo_url, e.total_training_points,
         COUNT(a.id)::int AS attempts_count,
         MAX(a.completed_at) AS last_attempt_at
       FROM employees e
       LEFT JOIN training_attempts a ON a.employee_id = e.id
       WHERE e.active = TRUE
       GROUP BY e.id
       ORDER BY e.total_training_points DESC, e.full_name ASC
       LIMIT 10`
    );
    return NextResponse.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('[GET /api/admin/training/leaderboard]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
