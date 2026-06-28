import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

// Simple per-route in-memory cache (resets on cold start — acceptable, this
// aggregates 30 days of data and doesn't need to be recomputed every load).
let cache: { data: unknown; expiresAt: number } | null = null;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (cache && cache.expiresAt > Date.now()) {
    return NextResponse.json(cache.data);
  }
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ name: string; count: string }>(
      `SELECT p.name, COUNT(c.id)::text AS count
       FROM prizes p
       JOIN claims c ON c.prize_id = p.id
       WHERE c.claimed_at > NOW() - INTERVAL '30 days'
       GROUP BY p.id, p.name
       ORDER BY COUNT(c.id) DESC
       LIMIT 5`,
    );

    const maxCount = rows.length > 0 ? parseInt(rows[0].count, 10) : 1;
    const items = rows.map((r) => {
      const count = parseInt(r.count, 10);
      return {
        name: r.name,
        count,
        percentage: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0,
      };
    });

    const data = { items };
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return NextResponse.json(data);
  } catch (err) {
    console.error('top-premios route error', err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
