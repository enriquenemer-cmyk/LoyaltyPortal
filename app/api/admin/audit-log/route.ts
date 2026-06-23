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

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ logs: [], total: 0 }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const action = searchParams.get('action');
  const offset = (page - 1) * PAGE_SIZE;

  const pool = getPool();

  try {
    const whereClause = action ? 'WHERE action = $1' : '';
    const logsParams = action ? [action, PAGE_SIZE, offset] : [PAGE_SIZE, offset];
    const logsQuery = action
      ? `SELECT * FROM activity_log ${whereClause} ORDER BY created_at DESC LIMIT $2 OFFSET $3`
      : `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

    const countQuery = action
      ? `SELECT COUNT(*)::text AS count FROM activity_log ${whereClause}`
      : `SELECT COUNT(*)::text AS count FROM activity_log`;
    const countParams = action ? [action] : [];

    const [logsResult, countResult] = await Promise.all([
      pool.query(logsQuery, logsParams),
      pool.query<{ count: string }>(countQuery, countParams),
    ]);

    return NextResponse.json({
      logs: logsResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
    });
  } catch (err) {
    console.error('[/api/admin/audit-log]', err);
    return NextResponse.json({ logs: [], total: 0 }, { status: 500 });
  }
}
