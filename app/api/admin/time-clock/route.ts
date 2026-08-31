import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get('employee_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (employeeId) {
    conditions.push(`tce.employee_id = $${idx++}`);
    values.push(employeeId);
  }
  if (from) {
    conditions.push(`tce.clock_in >= $${idx++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`tce.clock_in <= $${idx++}`);
    values.push(to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       tce.id,
       tce.employee_id,
       e.full_name,
       e.position,
       tce.clock_in,
       tce.clock_out,
       tce.clock_in_lat,
       tce.clock_in_lng,
       tce.clock_out_lat,
       tce.clock_out_lng,
       CASE WHEN tce.clock_out IS NULL THEN NULL
            ELSE EXTRACT(EPOCH FROM (tce.clock_out - tce.clock_in))::int
       END AS duration_seconds,
       (tce.clock_out IS NULL) AS is_active
     FROM time_clock_entries tce
     JOIN employees e ON e.id = tce.employee_id
     ${whereClause}
     ORDER BY tce.clock_in DESC
     LIMIT 500`,
    values
  );

  return NextResponse.json({ entries: rows });
}
