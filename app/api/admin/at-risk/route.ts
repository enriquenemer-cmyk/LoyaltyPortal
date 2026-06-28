import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export interface AtRiskClient {
  full_name: string;
  phone: string;
  email: string;
  last_visit: string;
  days_ago: number;
  total_claims: number;
}

export async function GET() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const pool = getPool();
    const { rows } = await pool.query<{
      full_name: string;
      phone: string;
      email: string;
      last_visit: string;
      days_ago: string;
      total_claims: string;
    }>(
      `SELECT full_name, phone, email,
              MAX(claimed_at)::text AS last_visit,
              EXTRACT(DAY FROM NOW() - MAX(claimed_at))::text AS days_ago,
              COUNT(*)::text AS total_claims
       FROM claims
       GROUP BY full_name, phone, email
       HAVING MAX(claimed_at) < NOW() - INTERVAL '30 days'
       ORDER BY last_visit DESC
       LIMIT 5`,
    );
    return NextResponse.json({
      clients: rows.map((r) => ({
        full_name: r.full_name,
        phone: r.phone,
        email: r.email,
        last_visit: r.last_visit,
        days_ago: Math.round(parseFloat(r.days_ago)),
        total_claims: parseInt(r.total_claims, 10),
      })) satisfies AtRiskClient[],
    });
  } catch (err) {
    console.error('at-risk route error', err);
    return NextResponse.json({ clients: [] }, { status: 500 });
  }
}
