import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

async function safeCount(query: string, params: unknown[] = []): Promise<number> {
  try {
    const { rows } = await getPool().query<{ count: string }>(query, params);
    return parseInt(rows[0]?.count ?? '0', 10);
  } catch {
    return 0;
  }
}

export async function GET() {
  const pool = getPool();
  const start = Date.now();

  let uptime_check = false;
  try {
    await pool.query('SELECT 1');
    uptime_check = true;
  } catch {
    return NextResponse.json(
      {
        db_latency_ms: -1,
        total_records: { prizes: 0, claims: 0, restaurants: 0, users: 0, game_plays: 0, ticket_claims: 0, notifications: 0, messages: 0 },
        recent_errors: [],
        uptime_check: false,
        table_health: { claims_today: 0, prizes_active: 0, notifications_unread: 0 },
      },
      { status: 200 }
    );
  }

  const db_latency_ms = Date.now() - start;

  const [
    prizes,
    claims,
    restaurants,
    users,
    game_plays,
    ticket_claims,
    notifications,
    messages,
    claims_today,
    prizes_active,
    notifications_unread,
  ] = await Promise.all([
    safeCount('SELECT COUNT(*) as count FROM prizes'),
    safeCount('SELECT COUNT(*) as count FROM claims'),
    safeCount('SELECT COUNT(*) as count FROM restaurants'),
    safeCount('SELECT COUNT(*) as count FROM users'),
    safeCount('SELECT COUNT(*) as count FROM game_plays'),
    safeCount('SELECT COUNT(*) as count FROM ticket_claims'),
    safeCount("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'notifications'").then(async (exists) => {
      if (exists === 0) return 0;
      return safeCount('SELECT COUNT(*) as count FROM notifications');
    }),
    safeCount("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'messages'").then(async (exists) => {
      if (exists === 0) return 0;
      return safeCount('SELECT COUNT(*) as count FROM messages');
    }),
    safeCount(
      "SELECT COUNT(*) as count FROM claims WHERE claimed_at >= CURRENT_DATE AND claimed_at < CURRENT_DATE + INTERVAL '1 day'"
    ),
    safeCount(
      "SELECT COUNT(*) as count FROM prizes WHERE cancelled = FALSE AND end_date::date >= CURRENT_DATE"
    ),
    safeCount("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'notifications'").then(async (exists) => {
      if (exists === 0) return 0;
      return safeCount("SELECT COUNT(*) as count FROM notifications WHERE read_at IS NULL").catch(() => 0);
    }),
  ]);

  let recent_errors: unknown[] = [];
  try {
    const { rows } = await pool.query(
      `SELECT id, action, description, user_name, created_at, metadata
       FROM activity_log
       WHERE action = 'error'
       ORDER BY created_at DESC
       LIMIT 5`
    );
    recent_errors = rows;
  } catch {
    recent_errors = [];
  }

  return NextResponse.json({
    db_latency_ms,
    total_records: { prizes, claims, restaurants, users, game_plays, ticket_claims, notifications, messages },
    recent_errors,
    uptime_check,
    table_health: { claims_today, prizes_active, notifications_unread },
  });
}
