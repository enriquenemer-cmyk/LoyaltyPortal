import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// DELETE /api/admin/contabilidad/conciliacion/movimientos/[id] — elimina un
// movimiento bancario importado por error. Si ya estaba conciliado con una
// compra, primero libera esa compra.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE supplier_purchases SET bank_movement_id = NULL WHERE bank_movement_id = $1`, [id]);
      const { rowCount } = await client.query(
        `DELETE FROM bank_movements WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2`,
        [id, restaurantId]
      );
      await client.query('COMMIT');
      if (rowCount === 0) return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/contabilidad/conciliacion/movimientos/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar el movimiento' }, { status: 500 });
  }
}
