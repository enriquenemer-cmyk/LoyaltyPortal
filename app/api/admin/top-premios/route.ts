import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
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

    return NextResponse.json({ items });
  } catch (err) {
    console.error('top-premios route error', err);
    return NextResponse.json({ items: [] }, { status: 500 });
  }
}
