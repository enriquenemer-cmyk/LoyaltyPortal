import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// POST /api/admin/inventory/conteos/[id]/cerrar — aplica los ajustes: para
// cada artículo con una cantidad contada distinta a la esperada, actualiza el
// stock del sistema al valor contado y registra un movimiento de tipo
// 'ajuste' con la diferencia. Los artículos sin contar quedan sin tocar.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows: [count] } = await client.query(
        `SELECT status FROM inventory_counts WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
        [id, restaurantId]
      );
      if (!count) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Conteo no encontrado' }, { status: 404 });
      }
      if (count.status !== 'abierto') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Este conteo ya está cerrado' }, { status: 409 });
      }

      const { rows: items } = await client.query(
        `SELECT id, product_id, product_name, unit, expected_stock, counted_stock
         FROM inventory_count_items WHERE count_id = $1 AND counted_stock IS NOT NULL`,
        [id]
      );

      let adjusted = 0;
      for (const it of items) {
        const expected = Number(it.expected_stock);
        const counted = Number(it.counted_stock);
        if (Math.abs(counted - expected) < 0.0005) continue;

        await client.query(`UPDATE inventory_products SET current_stock = $1 WHERE id = $2`, [counted, it.product_id]);

        const diff = Math.round((counted - expected) * 1000) / 1000;
        await client.query(
          `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
           VALUES ($1, $2, 'ajuste', $3, $4, $5)`,
          [
            randomUUID(),
            it.product_id,
            Math.abs(diff),
            `Ajuste por conteo físico #${id.slice(0, 8).toUpperCase()}: ${diff > 0 ? '+' : ''}${diff} ${it.unit} (esperado ${expected}, contado ${counted})`,
            session.username,
          ]
        );
        adjusted++;
      }

      await client.query(
        `UPDATE inventory_counts SET status = 'cerrado', closed_by = $1, closed_at = NOW() WHERE id = $2`,
        [session.username, id]
      );

      await client.query('COMMIT');
      return NextResponse.json({ ok: true, adjusted_items: adjusted });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/inventory/conteos/[id]/cerrar POST]', err);
    return NextResponse.json({ error: 'Error al cerrar el conteo' }, { status: 500 });
  }
}
