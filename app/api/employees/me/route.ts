import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getEmployeeSession();

  if (!session.employeeId) {
    return NextResponse.json({ employee: null }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query<{
    id: string;
    full_name: string;
    position: string | null;
    photo_url: string | null;
  }>(
    `SELECT id, full_name, position, photo_url FROM employees WHERE id = $1 AND active = TRUE`,
    [session.employeeId]
  );

  if (rows.length === 0) {
    session.destroy();
    return NextResponse.json({ employee: null }, { status: 401 });
  }

  const { rows: openRows } = await pool.query<{ id: string; clock_in: string }>(
    `SELECT id, clock_in FROM time_clock_entries WHERE employee_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1`,
    [session.employeeId]
  );

  return NextResponse.json({
    employee: rows[0],
    openEntry: openRows[0] ?? null,
  });
}
