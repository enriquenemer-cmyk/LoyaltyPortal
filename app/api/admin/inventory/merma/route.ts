import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool, ensureSchema, ensureAccountingSchema } from '@/lib/db';

export const runtime = 'nodejs';

const REASONS = ['caducado', 'dañado', 'derramado', 'robo_perdida', 'error_preparacion', 'otro'] as const;
type Reason = (typeof REASONS)[number];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  await ensureSchema();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions: string[] = ['w.restaurant_id IS NOT DISTINCT FROM $1'];
  const values: unknown[] = [session.restaurantId ?? null];
  let idx = 2;
  if (from) { conditions.push(`w.created_at >= $${idx++}`); values.push(from); }
  if (to) { conditions.push(`w.created_at <= $${idx++}`); values.push(to); }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT w.id, w.product_id, p.name AS product_name, w.quantity, w.unit, w.reason,
            w.estimated_cost, w.notes, w.created_by, w.created_at
     FROM inventory_waste w
     JOIN inventory_products p ON p.id = w.product_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY w.created_at DESC
     LIMIT 500`,
    values
  );

  const totalCost = rows.reduce((sum, r) => sum + (r.estimated_cost ? Number(r.estimated_cost) : 0), 0);
  const byReason: Record<string, { count: number; cost: number }> = {};
  for (const r of rows) {
    const bucket = (byReason[r.reason] ??= { count: 0, cost: 0 });
    bucket.count += 1;
    bucket.cost += r.estimated_cost ? Number(r.estimated_cost) : 0;
  }

  // Tendencia de las últimas 8 semanas (independiente del filtro from/to) para
  // graficar si la merma está subiendo o bajando con el tiempo.
  const { rows: weekRows } = await pool.query(
    `SELECT date_trunc('week', created_at) AS week_start,
            COALESCE(SUM(estimated_cost), 0)::text AS cost,
            COUNT(*)::int AS count
     FROM inventory_waste
     WHERE restaurant_id IS NOT DISTINCT FROM $1 AND created_at > NOW() - INTERVAL '8 weeks'
     GROUP BY week_start
     ORDER BY week_start ASC`,
    [session.restaurantId ?? null]
  );
  const byWeek = weekRows.map((w) => ({
    week_start: w.week_start,
    cost: Number(w.cost),
    count: w.count,
  }));

  return NextResponse.json({ waste: rows, summary: { total_cost: totalCost, by_reason: byReason, by_week: byWeek } });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  await ensureSchema();
  const restaurantId = session.restaurantId ?? null;

  try {
    const body = await req.json();
    const { product_id, quantity, reason, estimated_cost, notes } = body ?? {};

    if (!product_id || typeof product_id !== 'string') {
      return NextResponse.json({ error: 'product_id es requerido' }, { status: 400 });
    }
    if (!REASONS.includes(reason)) {
      return NextResponse.json({ error: `reason debe ser uno de: ${REASONS.join(', ')}` }, { status: 400 });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: 'quantity debe ser un número positivo' }, { status: 400 });
    }
    const cost = estimated_cost !== undefined && estimated_cost !== null && estimated_cost !== ''
      ? Number(estimated_cost)
      : null;
    if (cost !== null && (!Number.isFinite(cost) || cost < 0)) {
      return NextResponse.json({ error: 'estimated_cost debe ser un número válido' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const productResult = await client.query<{ id: string; name: string; unit: string; current_stock: string }>(
        `SELECT id, name, unit, current_stock FROM inventory_products WHERE id = $1 FOR UPDATE`,
        [product_id]
      );
      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
      }
      const product = productResult.rows[0];
      const currentStock = Number(product.current_stock);
      if (currentStock < qty) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: `Stock insuficiente (disponible: ${currentStock} ${product.unit})` }, { status: 409 });
      }

      const newStock = Math.max(0, Math.round((currentStock - qty) * 1000) / 1000);
      await client.query(`UPDATE inventory_products SET current_stock = $1 WHERE id = $2`, [newStock, product.id]);

      const wasteId = randomUUID();
      const { rows: [waste] } = await client.query(
        `INSERT INTO inventory_waste (id, restaurant_id, product_id, quantity, unit, reason, estimated_cost, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, product_id, quantity, unit, reason, estimated_cost, notes, created_by, created_at`,
        [wasteId, restaurantId, product.id, qty, product.unit, reason as Reason, cost, notes || null, session.username]
      );

      await client.query(
        `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
         VALUES ($1, $2, 'merma', $3, $4, $5)`,
        [randomUUID(), product.id, qty, `Merma (${reason}): ${notes || 'sin nota'}`, session.username]
      );

      if (restaurantId && cost && cost > 0) {
        await ensureAccountingSchema();
        await client.query(
          `INSERT INTO accounting_entries (restaurant_id, date, type, category, amount, description, reference_id)
           VALUES ($1, CURRENT_DATE, 'expense', 'merma', $2, $3, $4)`,
          [restaurantId, cost, `Merma de ${product.name} (${reason})`, wasteId]
        ).catch(() => {});
      }

      await client.query('COMMIT');
      return NextResponse.json({ waste: { ...waste, product_name: product.name } }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/inventory/merma POST]', err);
    return NextResponse.json({ error: 'Error al registrar la merma' }, { status: 500 });
  }
}
