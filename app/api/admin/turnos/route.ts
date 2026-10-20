import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// GET /api/admin/turnos?week_start=YYYY-MM-DD — turnos planeados de esa
// semana (lunes a domingo) para todos los empleados activos, junto con las
// horas realmente fichadas ese día para poder comparar planeado vs. real.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('week_start');
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: 'week_start (AAAA-MM-DD) es requerido' }, { status: 400 });
    }
    const weekEnd = new Date(new Date(weekStart + 'T00:00:00').getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const pool = getPool();
    const { rows: employees } = await pool.query(
      `SELECT id, full_name FROM employees WHERE active = TRUE AND restaurant_id IS NOT DISTINCT FROM $1 ORDER BY full_name`,
      [restaurantId]
    );
    const { rows: shifts } = await pool.query(
      // to_char en vez de dejar que el driver serialice la columna DATE: si no,
      // pg la entrega como Date/ISO con hora, y la comparación exacta de
      // fechas en el frontend (string === string) nunca coincidiría.
      `SELECT s.id, s.employee_id, to_char(s.date, 'YYYY-MM-DD') AS date, s.start_time, s.end_time, s.notes
       FROM shift_schedules s
       JOIN employees e ON e.id = s.employee_id
       WHERE e.restaurant_id IS NOT DISTINCT FROM $1 AND s.date BETWEEN $2 AND $3`,
      [restaurantId, weekStart, weekEnd]
    );
    const { rows: actuals } = await pool.query(
      `SELECT t.employee_id, to_char(t.clock_in::date, 'YYYY-MM-DD') AS date, MIN(t.clock_in) AS first_clock_in,
              SUM(EXTRACT(EPOCH FROM (COALESCE(t.clock_out, NOW()) - t.clock_in)) / 3600.0) AS hours
       FROM time_clock_entries t
       JOIN employees e ON e.id = t.employee_id
       WHERE e.restaurant_id IS NOT DISTINCT FROM $1 AND t.clock_in::date BETWEEN $2 AND $3
       GROUP BY t.employee_id, t.clock_in::date`,
      [restaurantId, weekStart, weekEnd]
    );

    return NextResponse.json({ week_start: weekStart, week_end: weekEnd, employees, shifts, actuals });
  } catch (err) {
    console.error('[/api/admin/turnos GET]', err);
    return NextResponse.json({ error: 'Error al obtener los turnos' }, { status: 500 });
  }
}

// POST /api/admin/turnos — crea o actualiza el turno de un empleado en una
// fecha dada (un turno por empleado por día).
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { employee_id?: string; date?: string; start_time?: string; end_time?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }
  if (!body.employee_id || !body.date || !body.start_time || !body.end_time) {
    return NextResponse.json({ error: 'employee_id, date, start_time y end_time son requeridos' }, { status: 400 });
  }

  try {
    await ensureSchema();
    const pool = getPool();
    const { rows } = await pool.query(
      `INSERT INTO shift_schedules (id, employee_id, date, start_time, end_time, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (employee_id, date) DO UPDATE SET start_time = $4, end_time = $5, notes = $6
       RETURNING id, employee_id, to_char(date, 'YYYY-MM-DD') AS date, start_time, end_time, notes`,
      [randomUUID(), body.employee_id, body.date, body.start_time, body.end_time, body.notes?.trim() || null]
    );
    return NextResponse.json({ shift: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[/api/admin/turnos POST]', err);
    return NextResponse.json({ error: 'Error al guardar el turno' }, { status: 500 });
  }
}
