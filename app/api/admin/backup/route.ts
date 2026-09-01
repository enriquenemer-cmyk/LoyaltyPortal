import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();

  async function q(sql: string, params: unknown[] = []) {
    try { const { rows } = await pool.query(sql, params); return rows; }
    catch { return []; }
  }

  const [
    prizes, clients, claims, sales, saleItems,
    suppliers, purchases, purchaseItems, entries,
    costCards, budgetItems, orders,
  ] = await Promise.all([
    q(`SELECT * FROM prizes WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY created_at`, [restaurantId]),
    q(`SELECT id, full_name, phone, email, points, created_at FROM clients WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY created_at`, [restaurantId]),
    q(`SELECT c.*, p.name AS prize_name FROM claims c LEFT JOIN prizes p ON p.id=c.prize_id WHERE c.restaurant_id IS NOT DISTINCT FROM $1 ORDER BY c.created_at`, [restaurantId]),
    q(`SELECT * FROM pos_sales WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY created_at`, [restaurantId]),
    q(`SELECT si.* FROM pos_sale_items si JOIN pos_sales s ON s.id=si.sale_id WHERE s.restaurant_id IS NOT DISTINCT FROM $1`, [restaurantId]),
    q(`SELECT * FROM suppliers WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY created_at`, [restaurantId]),
    q(`SELECT * FROM supplier_purchases WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY date DESC`, [restaurantId]),
    q(`SELECT spi.* FROM supplier_purchase_items spi JOIN supplier_purchases sp ON sp.id=spi.purchase_id WHERE sp.restaurant_id IS NOT DISTINCT FROM $1`, [restaurantId]),
    q(`SELECT * FROM accounting_entries WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY date DESC`, [restaurantId]),
    q(`SELECT * FROM product_cost_cards WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY created_at`, [restaurantId]),
    q(`SELECT * FROM budget_items WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY month DESC`, [restaurantId]),
    q(`SELECT * FROM purchase_orders WHERE restaurant_id IS NOT DISTINCT FROM $1 ORDER BY created_at DESC`, [restaurantId]),
  ]);

  const backup = {
    _meta: {
      exported_at: new Date().toISOString(),
      platform: '3E Plataforma de Premios QR',
      version: '1.0',
      restaurant_id: restaurantId,
    },
    prizes,
    clients,
    claims,
    pos_sales: sales,
    pos_sale_items: saleItems,
    suppliers,
    supplier_purchases: purchases,
    supplier_purchase_items: purchaseItems,
    accounting_entries: entries,
    product_cost_cards: costCards,
    budget_items: budgetItems,
    purchase_orders: orders,
  };

  const json = JSON.stringify(backup, null, 2);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="3E-backup-${date}.json"`,
    },
  });
}
