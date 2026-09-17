import { NextRequest, NextResponse } from 'next/server';
import { getPool, createNotification } from '@/lib/db';

// Se ejecuta diario vía cron. Revisa productos con stock bajo (o en cero) y
// unidades por vencer en los próximos 3 días, y manda una notificación por
// la campanita del panel — sin depender de WhatsApp ni ninguna cuenta externa.
export async function GET(req: NextRequest) {
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const authorized =
    !process.env.CRON_SECRET ||
    bearer === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET;
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = getPool();
  let lowStockCount = 0;
  let expiringCount = 0;

  try {
    const { rows: lowStock } = await pool.query<{ id: string; name: string; unit: string; current_stock: string; min_stock_alert: string; restaurant_id: string | null }>(
      `SELECT id, name, unit, current_stock, min_stock_alert, restaurant_id
       FROM inventory_products
       WHERE active = TRUE AND min_stock_alert > 0 AND current_stock <= min_stock_alert`
    );

    for (const p of lowStock) {
      try {
        const agotado = Number(p.current_stock) <= 0;
        await createNotification({
          type: 'low_stock',
          title: agotado ? `Sin stock: ${p.name}` : `Stock bajo: ${p.name}`,
          body: agotado
            ? `${p.name} está agotado. Repón pronto para no perder ventas.`
            : `${p.name} tiene ${p.current_stock} ${p.unit} — por debajo del mínimo (${p.min_stock_alert} ${p.unit}).`,
          link: '/admin/inventario',
          restaurant_id: p.restaurant_id,
        });
        lowStockCount++;
      } catch {
        // no dejar que una falla bloquee el resto
      }
    }

    const { rows: expiring } = await pool.query<{ product_name: string; unit: string; weight: string; expires_at: string; restaurant_id: string | null }>(
      `SELECT p.name AS product_name, p.unit, u.weight, u.expires_at, p.restaurant_id
       FROM inventory_units u
       JOIN inventory_products p ON p.id = u.product_id
       WHERE u.status = 'available' AND u.expires_at IS NOT NULL
         AND u.expires_at <= CURRENT_DATE + INTERVAL '3 days'`
    );

    for (const u of expiring) {
      try {
        const vencido = new Date(u.expires_at) < new Date(new Date().toDateString());
        await createNotification({
          type: 'expiring_stock',
          title: vencido ? `Vencido: ${u.product_name}` : `Por vencer: ${u.product_name}`,
          body: `${u.weight} ${u.unit} de ${u.product_name} ${vencido ? 'ya venció' : `vence el ${u.expires_at}`}.`,
          link: '/admin/inventario',
          restaurant_id: u.restaurant_id,
        });
        expiringCount++;
      } catch {
        // no dejar que una falla bloquee el resto
      }
    }

    return NextResponse.json({ low_stock_notified: lowStockCount, expiring_notified: expiringCount });
  } catch (err) {
    console.error('[/api/cron/low-stock GET]', err);
    return NextResponse.json({ error: 'Error al revisar alertas de inventario' }, { status: 500 });
  }
}
