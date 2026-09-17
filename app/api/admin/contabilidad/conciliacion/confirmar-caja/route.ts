import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// POST /api/admin/contabilidad/conciliacion/confirmar-caja — vincula un corte
// de caja cerrado con el movimiento bancario del depósito correspondiente.
// action: 'undo' deshace un cruce ya confirmado.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { cash_cut_id?: string; movimiento_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }
  const { cash_cut_id, movimiento_id, action } = body ?? {};

  try {
    await ensureAccountingSchema();
  } catch (err) {
    console.error('[/api/admin/contabilidad/conciliacion/confirmar-caja ensureSchema]', err);
    return NextResponse.json({ error: 'Error al preparar la base de datos' }, { status: 500 });
  }
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (action === 'undo') {
      if (!cash_cut_id) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'cash_cut_id es requerido' }, { status: 400 });
      }
      await client.query(
        `UPDATE cash_cuts SET bank_movement_id = NULL WHERE id = $1 AND COALESCE(restaurant_id,'') = COALESCE($2,'')`,
        [cash_cut_id, restaurantId]
      );
      await client.query('COMMIT');
      return NextResponse.json({ ok: true });
    }

    if (!cash_cut_id || !movimiento_id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'cash_cut_id y movimiento_id son requeridos' }, { status: 400 });
    }

    const { rows: cutRows } = await client.query(
      `SELECT id, bank_movement_id FROM cash_cuts WHERE id = $1 AND COALESCE(restaurant_id,'') = COALESCE($2,'') FOR UPDATE`,
      [cash_cut_id, restaurantId]
    );
    if (cutRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Corte de caja no encontrado' }, { status: 404 });
    }
    if (cutRows[0].bank_movement_id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Ese corte ya está vinculado a otro movimiento' }, { status: 409 });
    }

    const { rows: movementRows } = await client.query(
      `SELECT id, matched_purchase_id FROM bank_movements WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
      [movimiento_id, restaurantId]
    );
    if (movementRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }
    if (movementRows[0].matched_purchase_id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Ese movimiento ya está conciliado con una compra' }, { status: 409 });
    }
    const { rows: alreadyUsed } = await client.query(
      `SELECT id FROM cash_cuts WHERE bank_movement_id = $1`,
      [movimiento_id]
    );
    if (alreadyUsed.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Ese movimiento ya está vinculado a otro corte de caja' }, { status: 409 });
    }

    await client.query(`UPDATE cash_cuts SET bank_movement_id = $1 WHERE id = $2`, [movimiento_id, cash_cut_id]);

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[/api/admin/contabilidad/conciliacion/confirmar-caja POST]', err);
    return NextResponse.json({ error: 'Error al vincular el depósito' }, { status: 500 });
  } finally {
    client.release();
  }
}
