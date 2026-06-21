import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export interface WeeklyData {
  this_week: number;
  last_week: number;
  change_pct: number;
}

export async function GET() {
  try {
    const pool = getPool();
    const { rows } = await pool.query<{
      this_week: string;
      last_week: string;
    }>(
      `SELECT
        SUM(CASE WHEN claimed_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)::text AS this_week,
        SUM(CASE WHEN claimed_at >= NOW() - INTERVAL '14 days' AND claimed_at < NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)::text AS last_week
      FROM claims`,
    );
    const row = rows[0];
    const thisWeek = parseInt(row?.this_week ?? '0', 10);
    const lastWeek = parseInt(row?.last_week ?? '0', 10);
    const changePct = lastWeek > 0
      ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
      : thisWeek > 0 ? 100 : 0;
    return NextResponse.json({
      this_week: thisWeek,
      last_week: lastWeek,
      change_pct: changePct,
    } satisfies WeeklyData);
  } catch (err) {
    console.error('weekly route error', err);
    return NextResponse.json({ this_week: 0, last_week: 0, change_pct: 0 }, { status: 500 });
  }
}
