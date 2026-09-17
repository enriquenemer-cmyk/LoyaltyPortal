import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// GET /api/admin/reportes/rentabilidad?from=&to= — margen real por platillo
// vendido en el POS, cruzando las ventas reales con el costo vigente en
// Inventario (productos simples) o en Fichas de Costo (recetas). Si un
// producto simple no tiene costo capturado, se reporta sin margen en vez de
// inventar un número.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = searchParams.get('to') || new Date().toISOString().slice(0, 10);

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT
         i.product_id,
         i.product_type,
         i.product_name,
         SUM(i.quantity) AS quantity_sold,
         SUM(i.subtotal) AS revenue,
         CASE
           WHEN i.product_type = 'recipe' THEN MAX(pc.cost_per_unit) * SUM(i.quantity)
           WHEN i.product_type = 'inventory' AND MAX(ip.cost_per_unit) IS NOT NULL THEN MAX(ip.cost_per_unit) * SUM(i.quantity)
           ELSE NULL
         END AS cost
       FROM pos_sale_items i
       JOIN pos_sales s ON s.id = i.sale_id
       LEFT JOIN product_cost_cards pc ON i.product_type = 'recipe' AND pc.id::text = i.product_id
       LEFT JOIN inventory_products ip ON i.product_type = 'inventory' AND ip.id = i.product_id
       WHERE s.cancelled_at IS NULL
         AND s.restaurant_id IS NOT DISTINCT FROM $1
         AND s.created_at::date BETWEEN $2 AND $3
       GROUP BY i.product_id, i.product_type, i.product_name
       ORDER BY revenue DESC`,
      [restaurantId, from, to]
    );

    const items = rows.map((r) => {
      const revenue = Number(r.revenue);
      const cost = r.cost !== null ? Number(r.cost) : null;
      const margin = cost !== null ? revenue - cost : null;
      const marginPct = margin !== null && revenue > 0 ? Math.round((margin / revenue) * 10000) / 100 : null;
      return {
        product_id: r.product_id,
        product_type: r.product_type,
        product_name: r.product_name,
        quantity_sold: Number(r.quantity_sold),
        revenue,
        cost,
        margin,
        margin_pct: marginPct,
      };
    });

    const totals = items.reduce(
      (acc, it) => {
        acc.revenue += it.revenue;
        if (it.cost !== null) {
          acc.cost += it.cost;
          acc.margin += it.margin ?? 0;
          acc.hasCost = true;
        }
        return acc;
      },
      { revenue: 0, cost: 0, margin: 0, hasCost: false }
    );

    return NextResponse.json({
      from, to, items,
      totals: {
        revenue: totals.revenue,
        cost: totals.hasCost ? totals.cost : null,
        margin: totals.hasCost ? totals.margin : null,
        margin_pct: totals.hasCost && totals.revenue > 0 ? Math.round((totals.margin / totals.revenue) * 10000) / 100 : null,
      },
    });
  } catch (err) {
    console.error('[/api/admin/reportes/rentabilidad GET]', err);
    return NextResponse.json({ error: 'Error al calcular la rentabilidad' }, { status: 500 });
  }
}
