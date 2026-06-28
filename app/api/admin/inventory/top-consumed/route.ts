import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await pool.query<{ product_id: string; name: string; total_quantity: string }>(
      `SELECT m.product_id, p.name, SUM(m.quantity) AS total_quantity
       FROM inventory_movements m
       JOIN inventory_products p ON p.id = m.product_id
       WHERE m.type = 'salida' AND m.created_at >= $1
       GROUP BY m.product_id, p.name
       ORDER BY total_quantity DESC
       LIMIT 5`,
      [thirtyDaysAgo.toISOString()]
    );

    const items = result.rows.map((r) => ({
      product_id: r.product_id,
      name: r.name,
      total_quantity: Number(r.total_quantity),
    }));

    const max = Math.max(...items.map((i) => i.total_quantity), 1);
    const withPct = items.map((i) => ({ ...i, percentage: Math.round((i.total_quantity / max) * 100) }));

    return NextResponse.json({ items: withPct });
  } catch (err) {
    console.error('[/api/admin/inventory/top-consumed GET]', err);
    return NextResponse.json({ error: 'Error al obtener productos más consumidos' }, { status: 500 });
  }
}
