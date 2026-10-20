import { NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

const CONSUMPTION_WINDOW_DAYS = 30;
const TARGET_DAYS_OF_STOCK = 14;
const ALERT_THRESHOLD_DAYS = 10;

// GET /api/admin/reportes/sugerencia-compra — para cada producto activo,
// calcula el consumo diario promedio real (salidas de los últimos 30 días) y
// proyecta en cuántos días se agota el stock actual. Sugiere reordenar los
// que se agotan pronto o ya están bajo el mínimo configurado, con una
// cantidad sugerida para volver a cubrir 14 días de operación.
export async function GET() {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();

    const { rows } = await pool.query(
      `SELECT
         p.id, p.name, p.unit, p.current_stock, p.min_stock_alert, p.supplier_id, s.name AS supplier_name,
         COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'salida' AND m.created_at > NOW() - INTERVAL '${CONSUMPTION_WINDOW_DAYS} days'), 0) / ${CONSUMPTION_WINDOW_DAYS}.0 AS avg_daily_consumption
       FROM inventory_products p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       LEFT JOIN inventory_movements m ON m.product_id = p.id
       WHERE p.active = TRUE AND p.restaurant_id IS NOT DISTINCT FROM $1
       GROUP BY p.id, s.name
       ORDER BY p.name`,
      [restaurantId]
    );

    const suggestions = rows
      .map((r) => {
        const currentStock = Number(r.current_stock);
        const minAlert = Number(r.min_stock_alert);
        const avgDaily = Math.round(Number(r.avg_daily_consumption) * 1000) / 1000;
        const daysUntilStockout = avgDaily > 0 ? Math.round((currentStock / avgDaily) * 10) / 10 : null;
        const suggestedQty = avgDaily > 0
          ? Math.max(0, Math.round((TARGET_DAYS_OF_STOCK * avgDaily - currentStock) * 100) / 100)
          : 0;
        return {
          id: r.id,
          name: r.name,
          unit: r.unit,
          current_stock: currentStock,
          min_stock_alert: minAlert,
          supplier_id: r.supplier_id,
          supplier_name: r.supplier_name,
          avg_daily_consumption: avgDaily,
          days_until_stockout: daysUntilStockout,
          suggested_qty: suggestedQty,
        };
      })
      .filter((p) => {
        const belowMin = p.min_stock_alert > 0 && p.current_stock <= p.min_stock_alert;
        const runningOut = p.days_until_stockout !== null && p.days_until_stockout <= ALERT_THRESHOLD_DAYS;
        return (belowMin || runningOut) && p.suggested_qty > 0;
      })
      .sort((a, b) => (a.days_until_stockout ?? 999) - (b.days_until_stockout ?? 999));

    return NextResponse.json({ suggestions, window_days: CONSUMPTION_WINDOW_DAYS, target_days: TARGET_DAYS_OF_STOCK });
  } catch (err) {
    console.error('[/api/admin/reportes/sugerencia-compra GET]', err);
    return NextResponse.json({ error: 'Error al calcular las sugerencias de compra' }, { status: 500 });
  }
}
