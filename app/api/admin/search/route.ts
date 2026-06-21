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

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ results: [] }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const pool = getPool();
  const pattern = `%${q}%`;

  try {
    const [premiosResult, clientesResult, cobrosResult] = await Promise.all([
      pool.query<{ type: string; id: string; title: string; subtitle: string; date: string }>(
        `SELECT 'premio' as type, id::text, name as title, reason as subtitle, created_at as date
         FROM prizes WHERE name ILIKE $1 OR reason ILIKE $1 LIMIT 5`,
        [pattern]
      ),
      pool.query<{ type: string; id: string; title: string; subtitle: string; date: string }>(
        `SELECT DISTINCT 'cliente' as type, phone as id, full_name as title, phone as subtitle, MAX(claimed_at) as date
         FROM claims WHERE full_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1
         GROUP BY phone, full_name LIMIT 5`,
        [pattern]
      ),
      pool.query<{ type: string; id: string; title: string; subtitle: string; date: string }>(
        `SELECT 'cobro' as type, c.id::text, c.full_name as title, p.name as subtitle, c.claimed_at as date
         FROM claims c JOIN prizes p ON p.id = c.prize_id
         WHERE c.full_name ILIKE $1 OR p.name ILIKE $1 LIMIT 5`,
        [pattern]
      ),
    ]);

    const results = [
      ...premiosResult.rows,
      ...clientesResult.rows,
      ...cobrosResult.rows,
    ];

    return NextResponse.json({ results });
  } catch (err) {
    console.error('[/api/admin/search]', err);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
