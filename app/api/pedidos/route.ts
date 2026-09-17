import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool, ensureAccountingSchema } from '@/lib/db';

export const runtime = 'nodejs';

type CartItem = { product_id: string; quantity: number; product_type: 'inventory' | 'recipe' };

const DELIVERY_TYPES = ['pickup', 'delivery'];

// POST /api/pedidos — el cliente envía su pedido SIN pagar. No se descuenta
// inventario todavía: el staff lo confirma primero desde /admin/pedidos-online
// (ahí sí se valida stock real y se genera la venta), evitando comprometer
// stock que en verdad no está disponible.
export async function POST(req: NextRequest) {
  let body: {
    customer_name?: string; customer_phone?: string; delivery_type?: string;
    address?: string; notes?: string; items?: CartItem[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }

  const customerName = (body.customer_name ?? '').trim();
  const customerPhone = (body.customer_phone ?? '').trim();
  const deliveryType = DELIVERY_TYPES.includes(body.delivery_type ?? '') ? body.delivery_type! : 'pickup';
  const address = (body.address ?? '').trim() || null;
  const notes = (body.notes ?? '').trim() || null;
  const items = Array.isArray(body.items) ? body.items : [];

  if (!customerName) return NextResponse.json({ error: 'Tu nombre es requerido' }, { status: 400 });
  if (!customerPhone || !/^\d{7,15}$/.test(customerPhone.replace(/\D/g, ''))) {
    return NextResponse.json({ error: 'Ingresa un teléfono válido' }, { status: 400 });
  }
  if (deliveryType === 'delivery' && !address) {
    return NextResponse.json({ error: 'La dirección es requerida para domicilio' }, { status: 400 });
  }
  if (items.length === 0) return NextResponse.json({ error: 'Tu carrito está vacío' }, { status: 400 });
  for (const it of items) {
    if (!it.product_id || !Number.isFinite(it.quantity) || it.quantity <= 0 || !['inventory', 'recipe'].includes(it.product_type)) {
      return NextResponse.json({ error: 'Artículo o cantidad inválida' }, { status: 400 });
    }
  }

  try {
    await ensureAccountingSchema();
    const pool = getPool();

    // Se recalcula el precio desde la base de datos (nunca desde lo que
    // mandó el cliente) para que nadie pueda manipular el total del pedido.
    const orderItems: { product_id: string; product_type: string; product_name: string; unit: string; quantity: number; unit_price: number; subtotal: number }[] = [];
    let total = 0;

    for (const it of items) {
      if (it.product_type === 'recipe') {
        const { rows } = await pool.query(
          `SELECT id, name, unit, selling_price FROM product_cost_cards WHERE id = $1 AND type = 'prepared' AND selling_price IS NOT NULL`,
          [it.product_id]
        );
        if (rows.length === 0) return NextResponse.json({ error: 'Uno de los artículos ya no está disponible' }, { status: 409 });
        const p = rows[0];
        const unitPrice = Number(p.selling_price);
        const subtotal = Math.round(unitPrice * it.quantity * 100) / 100;
        total += subtotal;
        orderItems.push({ product_id: p.id, product_type: 'recipe', product_name: p.name, unit: p.unit, quantity: it.quantity, unit_price: unitPrice, subtotal });
      } else {
        const { rows } = await pool.query(
          `SELECT id, name, unit, sale_price FROM inventory_products WHERE id = $1 AND active = TRUE AND sale_price IS NOT NULL`,
          [it.product_id]
        );
        if (rows.length === 0) return NextResponse.json({ error: 'Uno de los artículos ya no está disponible' }, { status: 409 });
        const p = rows[0];
        const unitPrice = Number(p.sale_price);
        const subtotal = Math.round(unitPrice * it.quantity * 100) / 100;
        total += subtotal;
        orderItems.push({ product_id: p.id, product_type: 'inventory', product_name: p.name, unit: p.unit, quantity: it.quantity, unit_price: unitPrice, subtotal });
      }
    }
    total = Math.round(total * 100) / 100;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orderId = randomUUID();
      await client.query(
        `INSERT INTO online_orders (id, customer_name, customer_phone, delivery_type, address, notes, total_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [orderId, customerName, customerPhone, deliveryType, address, notes, total]
      );
      for (const it of orderItems) {
        await client.query(
          `INSERT INTO online_order_items (id, order_id, product_id, product_type, product_name, unit, quantity, unit_price, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [randomUUID(), orderId, it.product_id, it.product_type, it.product_name, it.unit, it.quantity, it.unit_price, it.subtotal]
        );
      }
      await client.query('COMMIT');
      return NextResponse.json({ ok: true, order: { id: orderId, total_amount: total, items: orderItems } }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/pedidos POST]', err);
    return NextResponse.json({ error: 'Error al enviar el pedido' }, { status: 500 });
  }
}
