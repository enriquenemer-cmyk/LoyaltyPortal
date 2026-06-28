import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export interface ConversionData {
  total_prizes: number;
  total_claims: number;
  rate: number;
}

// Simple per-route in-memory cache (resets on cold start — acceptable, this
// aggregates 30 days of data and doesn't need to be recomputed every load).
let cache: { data: ConversionData; expiresAt: number } | null = null;
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
    const { rows } = await pool.query<{
      total_prizes: string;
      total_claims: string;
      rate: string | null;
    }>(
      `SELECT
        COUNT(DISTINCT p.id)::text AS total_prizes,
        COUNT(DISTINCT c.id)::text AS total_claims,
        ROUND(COUNT(DISTINCT c.id)::numeric / NULLIF(COUNT(DISTINCT p.id), 0) * 100, 1)::text AS rate
      FROM prizes p
      LEFT JOIN claims c ON c.prize_id = p.id
      WHERE p.created_at > NOW() - INTERVAL '30 days'
        AND p.cancelled = false`,
    );
    const row = rows[0];
    const data: ConversionData = {
      total_prizes: parseInt(row?.total_prizes ?? '0', 10),
      total_claims: parseInt(row?.total_claims ?? '0', 10),
      rate: parseFloat(row?.rate ?? '0'),
    };
    cache = { data, expiresAt: Date.now() + TTL_MS };
    return NextResponse.json(data);
  } catch (err) {
    console.error('conversion route error', err);
    return NextResponse.json({ total_prizes: 0, total_claims: 0, rate: 0 }, { status: 500 });
  }
}
