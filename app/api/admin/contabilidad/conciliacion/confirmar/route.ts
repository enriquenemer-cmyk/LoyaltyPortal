import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// POST /api/admin/contabilidad/conciliacion/confirmar — vincula una compra a
// proveedor con un movimiento bancario (confirmando una sugerencia automática
// o un cruce manual). action: 'undo' deshace un cruce ya confirmado.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { compra_id?: string; movimiento_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }
  const { compra_id, movimiento_id, action } = body ?? {};

  try {
    await ensureAccountingSchema();
  } catch (err) {
    console.error('[/api/admin/contabilidad/conciliacion/confirmar ensureSchema]', err);
    return NextResponse.json({ error: 'Error al preparar la base de datos' }, { status: 500 });
  }
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (action === 'undo') {
      if (!compra_id) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'compra_id es requerido' }, { status: 400 });
      }
      const { rows: [purchase] } = await client.query(
        `SELECT bank_movement_id FROM supplier_purchases WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
        [compra_id, restaurantId]
      );
      const previousMovementId = purchase?.bank_movement_id;
      await client.query(
        `UPDATE supplier_purchases SET bank_movement_id = NULL WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2`,
        [compra_id, restaurantId]
      );
      if (previousMovementId) {
        await client.query(`UPDATE bank_movements SET matched_purchase_id = NULL WHERE id = $1`, [previousMovementId]);
      }
      await client.query('COMMIT');
      return NextResponse.json({ ok: true });
    }

    if (!compra_id || !movimiento_id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'compra_id y movimiento_id son requeridos' }, { status: 400 });
    }

    const { rows: purchaseRows } = await client.query(
      `SELECT id, bank_movement_id FROM supplier_purchases WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
      [compra_id, restaurantId]
    );
    if (purchaseRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Compra no encontrada' }, { status: 404 });
    }
    if (purchaseRows[0].bank_movement_id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Esa compra ya está conciliada con otro movimiento' }, { status: 409 });
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
      return NextResponse.json({ error: 'Ese movimiento ya está conciliado con otra compra' }, { status: 409 });
    }

    await client.query(`UPDATE supplier_purchases SET bank_movement_id = $1 WHERE id = $2`, [movimiento_id, compra_id]);
    await client.query(`UPDATE bank_movements SET matched_purchase_id = $1 WHERE id = $2`, [compra_id, movimiento_id]);

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[/api/admin/contabilidad/conciliacion/confirmar POST]', err);
    return NextResponse.json({ error: 'Error al procesar la conciliación' }, { status: 500 });
  } finally {
    client.release();
  }
}
