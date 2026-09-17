import { NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT o.id, o.customer_name, o.customer_phone, o.delivery_type, o.address, o.notes,
              o.status, o.total_amount, o.pos_sale_id, o.rejection_reason, o.created_at, o.updated_at,
              COALESCE(json_agg(
                json_build_object('product_name', i.product_name, 'quantity', i.quantity, 'unit', i.unit, 'subtotal', i.subtotal)
                ORDER BY i.id
              ) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM online_orders o
       LEFT JOIN online_order_items i ON i.order_id = o.id
       WHERE o.restaurant_id IS NOT DISTINCT FROM $1 AND o.created_at > NOW() - INTERVAL '3 days'
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [restaurantId]
    );

    return NextResponse.json({ orders: rows });
  } catch (err) {
    console.error('[/api/admin/pedidos-online GET]', err);
    return NextResponse.json({ error: 'Error al obtener los pedidos' }, { status: 500 });
  }
}
