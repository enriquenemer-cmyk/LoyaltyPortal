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

type NotificationRow = {
  type: string;
  id: string;
  actor: string;
  subject: string;
  verb: string;
  created_at: string;
};

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ notifications: [] }, { status: 401 });
  }

  const pool = getPool();

  try {
    const { rows } = await pool.query<NotificationRow>(
      `SELECT 'claim' as type, c.id::text, c.full_name as actor, p.name as subject,
              c.claimed_at as created_at, 'canjeó' as verb
       FROM claims c JOIN prizes p ON p.id = c.prize_id
       WHERE c.claimed_at > NOW() - INTERVAL '48 hours'
       ORDER BY c.claimed_at DESC LIMIT 10`
    );

    return NextResponse.json({ notifications: rows });
  } catch (err) {
    console.error('[/api/admin/notifications]', err);
    return NextResponse.json({ notifications: [] }, { status: 500 });
  }
}
