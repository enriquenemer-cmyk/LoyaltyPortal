import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export interface HeatmapHour {
  hour: number;
  count: number;
}

// Simple per-route in-memory cache (resets on cold start — acceptable, this
// aggregates all-time claim data and doesn't need to be recomputed every load).
let cache: { data: { hours: HeatmapHour[] }; expiresAt: number } | null = null;
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

    const data = { hours };
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return NextResponse.json(data);
  } catch (err) {
    console.error('heatmap route error', err);
    return NextResponse.json({
      hours: Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 })),
    }, { status: 500 });
  }
}
