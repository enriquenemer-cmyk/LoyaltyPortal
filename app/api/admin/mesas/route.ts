import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

// El listado de mesas también lo necesita el cajero en el Punto de Venta
// (sesión de empleado, no de admin) para poder asignar una mesa a la venta.
export async function GET() {
  const session = await getSession();
  const employeeSession = await getEmployeeSession();
  const restaurantId = session.username ? (session.restaurantId ?? null) : employeeSession.employeeId ? (employeeSession.restaurantId ?? null) : undefined;
  if (restaurantId === undefined) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureSchema();
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT id, name, active FROM restaurant_tables WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY name`,
      [restaurantId]
    );
    return NextResponse.json({ tables: rows });
  } catch (err) {
    console.error('[/api/admin/mesas GET]', err);
    return NextResponse.json({ error: 'Error al obtener las mesas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }
  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: 'El nombre de la mesa es requerido' }, { status: 400 });
  }

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();
    const { rows: [table] } = await pool.query(
      `INSERT INTO restaurant_tables (id, restaurant_id, name) VALUES ($1,$2,$3) RETURNING id, name, active`,
      [randomUUID(), restaurantId, body.name.trim()]
    );
    return NextResponse.json({ table }, { status: 201 });
  } catch (err) {
    console.error('[/api/admin/mesas POST]', err);
    return NextResponse.json({ error: 'Error al crear la mesa' }, { status: 500 });
  }
}
