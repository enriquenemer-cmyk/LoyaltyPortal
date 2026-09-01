import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureAccountingSchema();
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') ?? '50');

  const { rows } = await pool.query(
    `SELECT sp.*, s.name AS supplier_name_joined,
            json_agg(
              json_build_object(
                'id', spi.id,
                'product_name', spi.product_name,
                'quantity', spi.quantity,
                'unit', spi.unit,
                'unit_cost', spi.unit_cost,
                'total', spi.total
              ) ORDER BY spi.id
            ) FILTER (WHERE spi.id IS NOT NULL) AS items
     FROM supplier_purchases sp
     LEFT JOIN suppliers s ON s.id = sp.supplier_id
     LEFT JOIN supplier_purchase_items spi ON spi.purchase_id = sp.id
     WHERE sp.restaurant_id IS NOT DISTINCT FROM $1
     GROUP BY sp.id, s.name
     ORDER BY sp.date DESC, sp.created_at DESC
     LIMIT $2`,
    [restaurantId, limit]
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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const total = (body.items ?? []).reduce(
      (sum: number, i: { quantity: number; unit_cost: number }) =>
        sum + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.unit_cost)) || 0),
      0
    );

    const { rows: [purchase] } = await client.query(
      `INSERT INTO supplier_purchases
         (restaurant_id, supplier_id, supplier_name, invoice_number, date, total, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        restaurantId,
        body.supplier_id ?? null,
        body.supplier_name ?? null,
        body.invoice_number ?? null,
        body.date ?? new Date().toISOString().slice(0, 10),
        total,
        body.notes ?? null,
      ]
    );

    for (const item of (body.items ?? [])) {
      await client.query(
        `INSERT INTO supplier_purchase_items (purchase_id, product_name, quantity, unit, unit_cost)
         VALUES ($1,$2,$3,$4,$5)`,
        [purchase.id, item.product_name, item.quantity, item.unit ?? 'pza', item.unit_cost]
      );
    }

    // Register as accounting expense
    await client.query(
      `INSERT INTO accounting_entries (restaurant_id, date, type, category, amount, description, reference_id)
       VALUES ($1,$2,'expense','compra_proveedor',$3,$4,$5)`,
      [
        restaurantId,
        purchase.date,
        total,
        `Compra a ${body.supplier_name ?? 'proveedor'}${body.invoice_number ? ` — Factura ${body.invoice_number}` : ''}`,
        purchase.id,
      ]
    );

    await client.query('COMMIT');
    return NextResponse.json(purchase);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
