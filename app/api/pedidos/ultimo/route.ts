import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';

export const runtime = 'nodejs';

// GET /api/pedidos/ultimo?phone= — busca el pedido más reciente de ese
// teléfono (público, sin cuenta) para poder ofrecer "repetir mi pedido". No
// expone nada más que sus propios pedidos, filtrado exactamente por el
// teléfono que el cliente escribe.
export async function GET(req: NextRequest) {
  const phone = new URL(req.url).searchParams.get('phone')?.trim();
  if (!phone || !/^\d{7,15}$/.test(phone.replace(/\D/g, ''))) {
    return NextResponse.json({ error: 'Ingresa un teléfono válido' }, { status: 400 });
  }

  try {
    await ensureAccountingSchema();
    const pool = getPool();
    const { rows: [order] } = await pool.query(
      `SELECT id, created_at FROM online_orders WHERE customer_phone = $1 ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );
    if (!order) return NextResponse.json({ order: null });

    const { rows: items } = await pool.query(
      `SELECT product_id, product_type, product_name, quantity FROM online_order_items WHERE order_id = $1`,
      [order.id]
    );

    return NextResponse.json({ order: { id: order.id, created_at: order.created_at, items } });
  } catch (err) {
    console.error('[/api/pedidos/ultimo GET]', err);
    return NextResponse.json({ error: 'Error al buscar tu último pedido' }, { status: 500 });
  }
}
