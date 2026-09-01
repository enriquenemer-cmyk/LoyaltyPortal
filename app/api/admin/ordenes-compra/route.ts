import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureAccountingSchema();
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();

  const { rows } = await pool.query(
    `SELECT po.*, s.name AS supplier_name_joined
     FROM purchase_orders po
     LEFT JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.restaurant_id IS NOT DISTINCT FROM $1
     ORDER BY po.created_at DESC LIMIT 50`,
    [restaurantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureAccountingSchema();
  const restaurantId = session.restaurantId ?? null;

  const body = await req.json();
  const pool = getPool();
  const total = (body.items ?? []).reduce(
    (s: number, i: { quantity: number; unit_cost: number }) =>
      s + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.unit_cost)) || 0),
    0
  );
  const { rows: [order] } = await pool.query(
    `INSERT INTO purchase_orders (restaurant_id, supplier_id, supplier_name, expected_date, notes, items, total)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [restaurantId, body.supplier_id ?? null, body.supplier_name ?? null,
     body.expected_date ?? null, body.notes ?? null, JSON.stringify(body.items ?? []), total]
  );
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureAccountingSchema();
  const restaurantId = session.restaurantId ?? null;

  const body = await req.json();
  const pool = getPool();
  const { rows: [order] } = await pool.query(
    `UPDATE purchase_orders SET status=$1 WHERE id=$2 AND restaurant_id IS NOT DISTINCT FROM $3 RETURNING *`,
    [body.status, body.id, restaurantId]
  );

  // If received → auto-create purchase in supplier_purchases
  if (body.status === 'recibida' && order) {
    await pool.query(
      `INSERT INTO supplier_purchases (restaurant_id, supplier_id, supplier_name, date, total, notes)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,$5)`,
      [restaurantId, order.supplier_id, order.supplier_name, order.total, `OC recibida — ${order.id.slice(0,8).toUpperCase()}`]
    ).then(async (res) => {
      const purchaseId = (res as { rows: { id: string }[] }).rows[0]?.id;
      if (!purchaseId) return;
      for (const item of (order.items ?? [])) {
        await pool.query(
          `INSERT INTO supplier_purchase_items (purchase_id, product_name, quantity, unit, unit_cost)
           VALUES ($1,$2,$3,$4,$5)`,
          [purchaseId, item.product_name, item.quantity, item.unit ?? 'pza', item.unit_cost ?? 0]
        );
      }
      await pool.query(
        `INSERT INTO accounting_entries (restaurant_id, date, type, category, amount, description, reference_id)
         VALUES ($1,CURRENT_DATE,'expense','compra_proveedor',$2,$3,$4)`,
        [restaurantId, order.total, `OC recibida: ${order.supplier_name ?? 'proveedor'}`, order.id]
      );
    }).catch(() => {});
  }

  return NextResponse.json(order ?? { ok: true });
}
