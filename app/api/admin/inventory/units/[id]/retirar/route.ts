import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

// POST /api/admin/inventory/units/[id]/retirar — retira la unidad entera de
// una sola vez: la marca como usada y descuenta exactamente su peso real
// del stock del producto (no una cantidad tipeada a mano).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const unitResult = await client.query<{
      id: string;
      product_id: string;
      order_number: string;
      weight: string;
      status: string;
    }>(`SELECT id, product_id, order_number, weight, status FROM inventory_units WHERE id = $1 FOR UPDATE`, [id]);

    if (unitResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Unidad no encontrada — ¿el QR es de este sistema?' }, { status: 404 });
    }
    const unit = unitResult.rows[0];

    if (unit.status !== 'available') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Esta unidad ya fue retirada anteriormente.' }, { status: 409 });
    }

    const productResult = await client.query<{ current_stock: string; name: string; unit: string }>(
      `SELECT current_stock, name, unit FROM inventory_products WHERE id = $1 FOR UPDATE`,
      [unit.product_id]
    );
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    const product = productResult.rows[0];
    const weight = Number(unit.weight);
    const newStock = Math.max(0, Number(product.current_stock) - weight);

    await client.query(
      `UPDATE inventory_units SET status = 'retired', retired_at = NOW(), retired_by = $1 WHERE id = $2`,
      [session.username, id]
    );
    await client.query(`UPDATE inventory_products SET current_stock = $1 WHERE id = $2`, [newStock, unit.product_id]);

    const movementId = randomUUID();
    await client.query(
      `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
       VALUES ($1, $2, 'salida', $3, $4, $5)`,
      [movementId, unit.product_id, weight, `Pedido #${unit.order_number} — retiro por QR`, session.username]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      ok: true,
      product_name: product.name,
      unit: product.unit,
      weight_removed: weight,
      new_stock: newStock,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[/api/admin/inventory/units/[id]/retirar POST]', err);
    return NextResponse.json({ error: 'Error al retirar la unidad' }, { status: 500 });
  } finally {
    client.release();
  }
}
