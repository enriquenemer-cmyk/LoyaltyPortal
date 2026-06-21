import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export interface HeatmapHour {
  hour: number;
  count: number;
}

export async function GET() {
  try {
    const pool = getPool();
    const { rows } = await pool.query<{ hour: string; count: string }>(
      `SELECT EXTRACT(HOUR FROM claimed_at AT TIME ZONE 'America/Mexico_City')::text AS hour,
              COUNT(*)::text AS count
       FROM claims
       GROUP BY hour
       ORDER BY hour`,
    );

    // Build full 24-entry array filling missing hours with 0
    const byHour = new Map<number, number>();
    for (const r of rows) {
      byHour.set(parseInt(r.hour, 10), parseInt(r.count, 10));
    }
    const hours: HeatmapHour[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: byHour.get(i) ?? 0,
    }));

    return NextResponse.json({ hours });
  } catch (err) {
    console.error('heatmap route error', err);
    return NextResponse.json({
      hours: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
    }, { status: 500 });
  }
}
