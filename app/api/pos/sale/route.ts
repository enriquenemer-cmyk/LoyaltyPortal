import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

type CartItem = { product_id: string; quantity: number; product_type?: 'inventory' | 'recipe' };
type SplitPayment = { method: string; amount: number };

const PAYMENT_METHODS = ['efectivo', 'tarjeta', 'otro'];

export async function GET() {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT s.id, s.total_amount, s.payment_method, s.employee_name, s.cancelled_at, s.created_at,
              COALESCE(json_agg(json_build_object('product_name', i.product_name, 'quantity', i.quantity, 'unit', i.unit, 'subtotal', i.subtotal) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM pos_sales s
       LEFT JOIN pos_sale_items i ON i.sale_id = s.id
       WHERE s.employee_id = $1 AND s.created_at::date = CURRENT_DATE
       GROUP BY s.id
       ORDER BY s.created_at DESC
       LIMIT 30`,
      [session.employeeId]
    );

    return NextResponse.json({ sales: rows });
  } catch (err) {
    console.error('[/api/pos/sale GET]', err);
    return NextResponse.json({ error: 'Error al obtener las ventas del día' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const items: CartItem[] = Array.isArray(body?.items) ? body.items : [];
    const paymentMethod = typeof body?.payment_method === 'string' && PAYMENT_METHODS.includes(body.payment_method)
      ? body.payment_method
      : 'efectivo';
    const tableId = typeof body?.table_id === 'string' && body.table_id ? body.table_id : null;
    const tableName = typeof body?.table_name === 'string' && body.table_name ? body.table_name : null;
    const rawPayments: SplitPayment[] = Array.isArray(body?.payments) ? body.payments : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 });
    }
    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== 'string' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ error: 'Artículo o cantidad inválida en el carrito' }, { status: 400 });
      }
    }

    let payments: SplitPayment[] = [];
    if (rawPayments.length > 0) {
      for (const p of rawPayments) {
        const amount = Number(p.amount);
        if (!PAYMENT_METHODS.includes(p.method) || !Number.isFinite(amount) || amount <= 0) {
          return NextResponse.json({ error: 'Cada parte de la cuenta dividida requiere un método válido y un monto positivo' }, { status: 400 });
        }
        payments.push({ method: p.method, amount: Math.round(amount * 100) / 100 });
      }
    }

    if (items.some(i => i.product_type === 'recipe')) {
      await ensureAccountingSchema();
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const saleId = randomUUID();
      let total = 0;
      const lineItems: { id: string; product_name: string; unit: string; quantity: number; unit_price: number; subtotal: number }[] = [];
      const finalPaymentMethod = payments.length > 0 ? 'dividida' : paymentMethod;

      await client.query(
        `INSERT INTO pos_sales (id, restaurant_id, employee_id, employee_name, total_amount, payment_method, table_id, table_name)
         VALUES ($1, $2, $3, $4, 0, $5, $6, $7)`,
        [saleId, session.restaurantId ?? null, session.employeeId, session.fullName ?? null, finalPaymentMethod, tableId, tableName]
      );

      for (const item of items) {
        if (item.product_type === 'recipe') {
          const cardResult = await client.query<{
            id: string; name: string; unit: string; selling_price: string | null; type: string;
          }>(
            `SELECT id, name, unit, selling_price, type FROM product_cost_cards WHERE id = $1`,
            [item.product_id]
          );
          if (cardResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Uno de los artículos ya no existe' }, { status: 404 });
          }
          const card = cardResult.rows[0];
          if (card.type !== 'prepared' || card.selling_price === null) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: `${card.name} ya no está disponible para la venta` }, { status: 409 });
          }

          const ingredientsResult = await client.query<{
            inventory_product_id: string; quantity: string; name: string; unit: string; current_stock: string;
          }>(
            `SELECT ri.inventory_product_id, ri.quantity, ip.name, ip.unit, ip.current_stock
             FROM recipe_ingredients ri
             JOIN inventory_products ip ON ip.id = ri.inventory_product_id
             WHERE ri.product_id = $1 AND ri.inventory_product_id IS NOT NULL
             FOR UPDATE OF ip`,
            [card.id]
          );

          for (const ing of ingredientsResult.rows) {
            const needed = Math.round(Number(ing.quantity) * item.quantity * 1000) / 1000;
            const available = Number(ing.current_stock);
            if (available < needed) {
              await client.query('ROLLBACK');
              return NextResponse.json({ error: `No hay suficiente ${ing.name} para preparar ${card.name} (disponible: ${available} ${ing.unit}, necesario: ${needed} ${ing.unit})` }, { status: 409 });
            }
          }

          for (const ing of ingredientsResult.rows) {
            const needed = Math.round(Number(ing.quantity) * item.quantity * 1000) / 1000;
            const newStock = Math.max(0, Math.round((Number(ing.current_stock) - needed) * 1000) / 1000);
            await client.query(`UPDATE inventory_products SET current_stock = $1 WHERE id = $2`, [newStock, ing.inventory_product_id]);
            await client.query(
              `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
               VALUES ($1, $2, 'salida', $3, $4, $5)`,
              [randomUUID(), ing.inventory_product_id, needed, `Receta "${card.name}" — venta en caja #${saleId.slice(0, 8).toUpperCase()}`, session.fullName ?? 'Cajero']
            );
          }

          const unitPrice = Number(card.selling_price);
          const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
          total += subtotal;

          const itemId = randomUUID();
          await client.query(
            `INSERT INTO pos_sale_items (id, sale_id, product_id, product_name, unit, quantity, unit_price, subtotal, product_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'recipe')`,
            [itemId, saleId, card.id, card.name, card.unit, item.quantity, unitPrice, subtotal]
          );

          lineItems.push({ id: itemId, product_name: card.name, unit: card.unit, quantity: item.quantity, unit_price: unitPrice, subtotal });
          continue;
        }

        const productResult = await client.query<{
          id: string; name: string; unit: string; current_stock: string; sale_price: string | null; active: boolean;
        }>(
          `SELECT id, name, unit, current_stock, sale_price, active FROM inventory_products WHERE id = $1 FOR UPDATE`,
          [item.product_id]
        );
        if (productResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: 'Uno de los artículos ya no existe' }, { status: 404 });
        }
        const product = productResult.rows[0];
        if (!product.active || product.sale_price === null) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: `${product.name} ya no está disponible para la venta` }, { status: 409 });
        }
        const currentStock = Number(product.current_stock);
        if (currentStock < item.quantity) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: `No hay suficiente stock de ${product.name} (disponible: ${currentStock} ${product.unit})` }, { status: 409 });
        }

        const unitPrice = Number(product.sale_price);
        const subtotal = Math.round(unitPrice * item.quantity * 100) / 100;
        total += subtotal;

        const newStock = Math.max(0, Math.round((currentStock - item.quantity) * 1000) / 1000);
        await client.query(`UPDATE inventory_products SET current_stock = $1 WHERE id = $2`, [newStock, product.id]);

        const itemId = randomUUID();
        await client.query(
          `INSERT INTO pos_sale_items (id, sale_id, product_id, product_name, unit, quantity, unit_price, subtotal, product_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'inventory')`,
          [itemId, saleId, product.id, product.name, product.unit, item.quantity, unitPrice, subtotal]
        );

        await client.query(
          `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
           VALUES ($1, $2, 'salida', $3, $4, $5)`,
          [randomUUID(), product.id, item.quantity, `Venta en caja #${saleId.slice(0, 8).toUpperCase()}`, session.fullName ?? 'Cajero']
        );

        lineItems.push({ id: itemId, product_name: product.name, unit: product.unit, quantity: item.quantity, unit_price: unitPrice, subtotal });
      }

      total = Math.round(total * 100) / 100;

      if (payments.length > 0) {
        const paymentsSum = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100;
        if (Math.abs(paymentsSum - total) > 0.01) {
          await client.query('ROLLBACK');
          return NextResponse.json({ error: `La suma de la cuenta dividida (${paymentsSum}) no coincide con el total (${total})` }, { status: 400 });
        }
        for (const p of payments) {
          await client.query(
            `INSERT INTO pos_sale_payments (id, sale_id, method, amount) VALUES ($1,$2,$3,$4)`,
            [randomUUID(), saleId, p.method, p.amount]
          );
        }
      }

      await client.query(`UPDATE pos_sales SET total_amount = $1 WHERE id = $2`, [total, saleId]);

      // Auto-register income in accounting
      if (session.restaurantId && total > 0) {
        await ensureAccountingSchema();
        const productNames = lineItems.map(l => l.product_name).join(', ');
        await client.query(
          `INSERT INTO accounting_entries (restaurant_id, date, type, category, amount, description, reference_id)
           VALUES ($1, CURRENT_DATE, 'income', 'venta', $2, $3, $4)`,
          [session.restaurantId, total, `Venta POS: ${productNames} (${finalPaymentMethod})`, saleId]
        ).catch(() => {});
      }

      await client.query('COMMIT');

      return NextResponse.json({ ok: true, sale: { id: saleId, total_amount: total, payment_method: finalPaymentMethod, table_name: tableName, payments, items: lineItems } }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/pos/sale POST]', err);
    return NextResponse.json({ error: 'Error al registrar la venta' }, { status: 500 });
  }
}
