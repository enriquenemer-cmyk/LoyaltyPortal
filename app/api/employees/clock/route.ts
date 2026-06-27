import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getEmployeeSession();

  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
  }

  let action: 'in' | 'out' | undefined;
  try {
    const body = await request.json();
    action = body?.action;
  } catch {
    // ignore, validated below
  }

  if (action !== 'in' && action !== 'out') {
    return NextResponse.json({ error: "Acción inválida. Usa 'in' o 'out'." }, { status: 400 });
  }

  const pool = getPool();
  const employeeId = session.employeeId;

  try {
    if (action === 'in') {
      const { rows: openRows } = await pool.query(
        `SELECT id FROM time_clock_entries WHERE employee_id = $1 AND clock_out IS NULL LIMIT 1`,
        [employeeId]
      );
      if (openRows.length > 0) {
        return NextResponse.json({ error: 'Ya tienes una entrada abierta.' }, { status: 409 });
      }

      const id = crypto.randomUUID();
      const { rows } = await pool.query<{ id: string; clock_in: string }>(
        `INSERT INTO time_clock_entries (id, employee_id, clock_in) VALUES ($1, $2, NOW()) RETURNING id, clock_in`,
        [id, employeeId]
      );

      return NextResponse.json({
        ok: true,
        status: 'clocked_in',
        entry: rows[0],
      });
    } else {
      const { rows: openRows } = await pool.query<{ id: string; clock_in: string }>(
        `SELECT id, clock_in FROM time_clock_entries WHERE employee_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1`,
        [employeeId]
      );

      if (openRows.length === 0) {
        return NextResponse.json({ error: 'No hay una entrada abierta para cerrar.' }, { status: 409 });
      }

      const { rows } = await pool.query<{
        id: string;
        clock_in: string;
        clock_out: string;
        duration_seconds: number;
      }>(
        `UPDATE time_clock_entries
         SET clock_out = NOW()
         WHERE id = $1
         RETURNING id, clock_in, clock_out, EXTRACT(EPOCH FROM (clock_out - clock_in))::int AS duration_seconds`,
        [openRows[0].id]
      );

      return NextResponse.json({
        ok: true,
        status: 'clocked_out',
        entry: rows[0],
      });
    }
  } catch (err) {
    console.error('Clock action error:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
