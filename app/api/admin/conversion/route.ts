import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export interface ConversionData {
  total_prizes: number;
  total_claims: number;
  rate: number;
}

export async function GET() {
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
    return NextResponse.json({
      total_prizes: parseInt(row?.total_prizes ?? '0', 10),
      total_claims: parseInt(row?.total_claims ?? '0', 10),
      rate: parseFloat(row?.rate ?? '0'),
    } satisfies ConversionData);
  } catch (err) {
    console.error('conversion route error', err);
    return NextResponse.json({ total_prizes: 0, total_claims: 0, rate: 0 }, { status: 500 });
  }
}
