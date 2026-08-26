import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export type InventoryUnit = {
  id: string;
  product_id: string;
  product_name?: string;
  unit?: string;
  order_number: string;
  weight: string;
  status: 'available' | 'retired';
  received_at: string;
  retired_at: string | null;
  retired_by: string | null;
};

// GET /api/admin/inventory/units?product_id=X&status=available
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  const status = searchParams.get('status');

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (productId) {
    conditions.push(`u.product_id = $${idx++}`);
    values.push(productId);
  }
  if (status) {
    conditions.push(`u.status = $${idx++}`);
    values.push(status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await getPool().query<InventoryUnit>(
      `SELECT u.id, u.product_id, p.name as product_name, p.unit, u.order_number, u.weight, u.status,
              u.received_at, u.retired_at, u.retired_by
       FROM inventory_units u
       JOIN inventory_products p ON p.id = u.product_id
       ${whereClause}
       ORDER BY u.received_at DESC`,
      values
    );
    return NextResponse.json({ units: rows });
  } catch (err) {
    console.error('[/api/admin/inventory/units GET]', err);
    return NextResponse.json({ error: 'Error al obtener unidades' }, { status: 500 });
  }
}

// POST /api/admin/inventory/units — registra la llegada de un pedido: crea
// una unidad por cada peso individual y suma el total al stock del producto.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { product_id, order_number, weights } = body ?? {};

    if (!product_id || typeof product_id !== 'string') {
      return NextResponse.json({ error: 'product_id es requerido' }, { status: 400 });
    }
    if (!order_number || typeof order_number !== 'string') {
      return NextResponse.json({ error: 'order_number es requerido' }, { status: 400 });
    }
    if (!Array.isArray(weights) || weights.length === 0) {
      return NextResponse.json({ error: 'weights debe ser una lista con al menos un peso' }, { status: 400 });
    }
    const parsedWeights = weights.map((w) => Number(w));
    if (parsedWeights.some((w) => !Number.isFinite(w) || w <= 0)) {
      return NextResponse.json({ error: 'Todos los pesos deben ser números positivos' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const productResult = await client.query<{ id: string; current_stock: string; name: string; unit: string }>(
        `SELECT id, current_stock, name, unit FROM inventory_products WHERE id = $1 FOR UPDATE`,
        [product_id]
      );
      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
      }
      const product = productResult.rows[0];

      const createdUnits: InventoryUnit[] = [];
      for (const weight of parsedWeights) {
        const id = randomUUID();
        const { rows } = await client.query<InventoryUnit>(
          `INSERT INTO inventory_units (id, product_id, order_number, weight, status)
           VALUES ($1, $2, $3, $4, 'available')
           RETURNING id, product_id, order_number, weight, status, received_at, retired_at, retired_by`,
          [id, product_id, order_number.trim(), weight]
        );
        createdUnits.push({ ...rows[0], product_name: product.name, unit: product.unit });
      }

      const totalWeight = parsedWeights.reduce((sum, w) => sum + w, 0);
      const newStock = Number(product.current_stock) + totalWeight;

      await client.query(`UPDATE inventory_products SET current_stock = $1 WHERE id = $2`, [newStock, product_id]);

      const movementId = randomUUID();
      await client.query(
        `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
         VALUES ($1, $2, 'entrada', $3, $4, $5)`,
        [movementId, product_id, totalWeight, `Pedido #${order_number.trim()} — ${parsedWeights.length} unidad(es) por QR`, session.username]
      );

      await client.query('COMMIT');

      return NextResponse.json({ units: createdUnits, total_weight: totalWeight }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/inventory/units POST]', err);
    return NextResponse.json({ error: 'Error al registrar unidades' }, { status: 500 });
  }
}
