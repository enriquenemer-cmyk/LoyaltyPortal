import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { rows } = await getPool().query<{
    phone: string;
    full_name: string;
    last_visit: string;
    days_since_visit: number;
    total_visits: number;
    segment: string;
  }>(`
    SELECT
      phone,
      MAX(full_name) AS full_name,
      MAX(last_visit)::text AS last_visit,
      EXTRACT(DAY FROM NOW() - MAX(last_visit))::int AS days_since_visit,
      COUNT(*)::int AS total_visits,
      CASE
        WHEN MAX(last_visit) < NOW() - INTERVAL '60 days' THEN 'perdido'
        WHEN MAX(last_visit) < NOW() - INTERVAL '30 days' THEN 'en_riesgo'
        ELSE 'dormido'
      END AS segment
    FROM (
      SELECT phone, full_name, claimed_at AS last_visit FROM ticket_claims
      UNION ALL
      SELECT c.phone, c.full_name, c.claimed_at AS last_visit FROM claims c
    ) a
    GROUP BY phone
    HAVING MAX(last_visit) < NOW() - INTERVAL '15 days'
    ORDER BY MAX(last_visit) ASC
    LIMIT 200
  `);

  return NextResponse.json({ customers: rows });
}
