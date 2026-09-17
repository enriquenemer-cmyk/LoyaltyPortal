import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// POST /api/admin/pedidos-online/[id]/confirmar — el staff confirma que sí
// hay disponibilidad real: recién AQUÍ se valida y descuenta el inventario
// (mismo criterio que una venta del POS) y se genera la venta correspondiente,
// nunca antes — así un pedido en línea jamás compromete stock inexistente.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

      const { rows: [order] } = await client.query(
        `SELECT * FROM online_orders WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
        [id, restaurantId]
      );
      if (!order) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
      }
      if (order.status !== 'pendiente') {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Este pedido ya fue procesado' }, { status: 409 });
      }

      const { rows: items } = await client.query(
        `SELECT product_id, product_type, product_name, unit, quantity, unit_price, subtotal FROM online_order_items WHERE order_id = $1`,
        [id]
      );

      const saleId = randomUUID();
      await client.query(
        `INSERT INTO pos_sales (id, restaurant_id, employee_id, employee_name, total_amount, payment_method)
         VALUES ($1, $2, NULL, $3, $4, 'efectivo')`,
        [saleId, restaurantId, `Pedido en línea (confirmado por ${session.username})`, order.total_amount]
      );

      for (const item of items) {
        if (item.product_type === 'recipe') {
          const { rows: cardRows } = await client.query(
            `SELECT id, name, type, selling_price FROM product_cost_cards WHERE id = $1`,
            [item.product_id]
          );
          if (cardRows.length === 0 || cardRows[0].type !== 'prepared' || cardRows[0].selling_price === null) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: `${item.product_name} ya no está disponible` }, { status: 409 });
          }

          const { rows: ingredientsResult } = await client.query(
            `SELECT ri.inventory_product_id, ri.quantity, ip.name, ip.unit, ip.current_stock
             FROM recipe_ingredients ri
             JOIN inventory_products ip ON ip.id = ri.inventory_product_id
             WHERE ri.product_id = $1 AND ri.inventory_product_id IS NOT NULL
             FOR UPDATE OF ip`,
            [item.product_id]
          );

          for (const ing of ingredientsResult) {
            const needed = Math.round(Number(ing.quantity) * Number(item.quantity) * 1000) / 1000;
            if (Number(ing.current_stock) < needed) {
              await client.query('ROLLBACK');
              return NextResponse.json({ error: `No hay suficiente ${ing.name} para preparar ${item.product_name} (disponible: ${ing.current_stock} ${ing.unit}, necesario: ${needed} ${ing.unit})` }, { status: 409 });
            }
          }
          for (const ing of ingredientsResult) {
            const needed = Math.round(Number(ing.quantity) * Number(item.quantity) * 1000) / 1000;
            const newStock = Math.max(0, Math.round((Number(ing.current_stock) - needed) * 1000) / 1000);
            await client.query(`UPDATE inventory_products SET current_stock = $1 WHERE id = $2`, [newStock, ing.inventory_product_id]);
            await client.query(
              `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
               VALUES ($1, $2, 'salida', $3, $4, $5)`,
              [randomUUID(), ing.inventory_product_id, needed, `Receta "${item.product_name}" — pedido en línea #${id.slice(0, 8).toUpperCase()}`, session.username]
            );
          }
        } else {
          const { rows: productRows } = await client.query(
            `SELECT id, name, unit, current_stock, sale_price, active FROM inventory_products WHERE id = $1 FOR UPDATE`,
            [item.product_id]
          );
          if (productRows.length === 0 || !productRows[0].active || productRows[0].sale_price === null) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: `${item.product_name} ya no está disponible` }, { status: 409 });
          }
          const product = productRows[0];
          const currentStock = Number(product.current_stock);
          if (currentStock < Number(item.quantity)) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: `No hay suficiente stock de ${product.name} (disponible: ${currentStock} ${product.unit})` }, { status: 409 });
          }
          const newStock = Math.max(0, Math.round((currentStock - Number(item.quantity)) * 1000) / 1000);
          await client.query(`UPDATE inventory_products SET current_stock = $1 WHERE id = $2`, [newStock, product.id]);
          await client.query(
            `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
             VALUES ($1, $2, 'salida', $3, $4, $5)`,
            [randomUUID(), product.id, item.quantity, `Pedido en línea #${id.slice(0, 8).toUpperCase()}`, session.username]
          );
        }

        await client.query(
          `INSERT INTO pos_sale_items (id, sale_id, product_id, product_type, product_name, unit, quantity, unit_price, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [randomUUID(), saleId, item.product_id, item.product_type, item.product_name, item.unit, item.quantity, item.unit_price, item.subtotal]
        );
      }

      if (restaurantId) {
        await client.query(
          `INSERT INTO accounting_entries (restaurant_id, date, type, category, amount, description, reference_id)
           VALUES ($1, CURRENT_DATE, 'income', 'venta', $2, $3, $4)`,
          [restaurantId, order.total_amount, `Pedido en línea confirmado — ${order.customer_name}`, saleId]
        ).catch(() => {});
      }

      const { rows: [updatedOrder] } = await client.query(
        `UPDATE online_orders SET status = 'confirmado', pos_sale_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [saleId, id]
      );

      await client.query('COMMIT');
      return NextResponse.json({ order: updatedOrder, sale_id: saleId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/pedidos-online/[id]/confirmar POST]', err);
    return NextResponse.json({ error: 'Error al confirmar el pedido' }, { status: 500 });
  }
}
