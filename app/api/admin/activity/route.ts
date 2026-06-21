import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ day: string; count: string }>(
      `SELECT DATE(claimed_at)::text AS day, COUNT(*)::text AS count
       FROM claims
       WHERE claimed_at > NOW() - INTERVAL '14 days'
       GROUP BY day
       ORDER BY day ASC`,
    );
    return NextResponse.json({
      days: rows.map((r) => ({ day: r.day, count: parseInt(r.count, 10) })),
    });
  } catch (err) {
    console.error('activity route error', err);
    return NextResponse.json({ days: [] }, { status: 500 });
  }
}
