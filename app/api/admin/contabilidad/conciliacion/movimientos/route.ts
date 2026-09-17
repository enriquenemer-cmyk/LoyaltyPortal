import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

type MovementInput = { date: string; amount: number; description: string };

// POST /api/admin/contabilidad/conciliacion/movimientos — importa movimientos
// bancarios en lote (pegados desde el estado de cuenta) para poder conciliarlos
// contra las compras a proveedores registradas.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;

    const body = await req.json();
    const movements: MovementInput[] = Array.isArray(body?.movements) ? body.movements : [];
    if (movements.length === 0) {
      return NextResponse.json({ error: 'No se recibieron movimientos' }, { status: 400 });
    }

    const clean: MovementInput[] = [];
    for (const m of movements) {
      const amount = Number(m.amount);
      if (!m.date || !Number.isFinite(amount) || !m.description || !String(m.description).trim()) {
        return NextResponse.json({ error: 'Cada movimiento requiere fecha, importe y descripción' }, { status: 400 });
      }
      clean.push({ date: m.date, amount, description: String(m.description).trim() });
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];
      for (const m of clean) {
        const { rows: [row] } = await client.query(
          `INSERT INTO bank_movements (restaurant_id, date, amount, description) VALUES ($1,$2,$3,$4) RETURNING *`,
          [restaurantId, m.date, m.amount, m.description]
        );
        inserted.push(row);
      }
      await client.query('COMMIT');
      return NextResponse.json({ movements: inserted }, { status: 201 });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/contabilidad/conciliacion/movimientos POST]', err);
    return NextResponse.json({ error: 'Error al importar los movimientos. Verifica el formato fecha,importe,descripción.' }, { status: 500 });
  }
}
