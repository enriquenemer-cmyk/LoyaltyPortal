import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type InventoryMovement = {
  id: string;
  product_id: string;
  product_name: string;
  type: 'entrada' | 'salida';
  quantity: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get('product_id');
  const type = searchParams.get('type');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (productId) {
    conditions.push(`m.product_id = $${idx++}`);
    values.push(productId);
  }
  if (type) {
    conditions.push(`m.type = $${idx++}`);
    values.push(type);
  }
  if (from) {
    conditions.push(`m.created_at >= $${idx++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`m.created_at <= $${idx++}`);
    values.push(to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const pool = getPool();
    const result = await pool.query<InventoryMovement>(
      `SELECT m.id, m.product_id, p.name as product_name, m.type, m.quantity, m.note, m.created_by, m.created_at
       FROM inventory_movements m
       JOIN inventory_products p ON p.id = m.product_id
       ${whereClause}
       ORDER BY m.created_at DESC`,
      values
    );

    return NextResponse.json({ movements: result.rows });
  } catch (err) {
    console.error('[/api/admin/inventory/movements GET]', err);
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { product_id, type, quantity, note } = body ?? {};

    if (!product_id || typeof product_id !== 'string') {
      return NextResponse.json({ error: 'product_id es requerido' }, { status: 400 });
    }
    if (type !== 'entrada' && type !== 'salida') {
      return NextResponse.json({ error: "type debe ser 'entrada' o 'salida'" }, { status: 400 });
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: 'quantity debe ser un número positivo' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const productResult = await client.query<{ id: string; current_stock: string }>(
        `SELECT id, current_stock FROM inventory_products WHERE id = $1 FOR UPDATE`,
        [product_id]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
      }

      const currentStock = Number(productResult.rows[0].current_stock);

      if (type === 'salida' && currentStock - qty < 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Stock insuficiente' }, { status: 400 });
      }

      const movementId = randomUUID();
      const movementResult = await client.query<InventoryMovement>(
        `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, product_id, type, quantity, note, created_by, created_at`,
        [movementId, product_id, type, qty, note ?? null, session.username]
      );

      const newStock = type === 'entrada' ? currentStock + qty : currentStock - qty;

      await client.query(
        `UPDATE inventory_products SET current_stock = $1 WHERE id = $2`,
        [newStock, product_id]
      );

      await client.query('COMMIT');

      return NextResponse.json({ movement: movementResult.rows[0] }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/inventory/movements POST]', err);
    return NextResponse.json({ error: 'Error al crear movimiento' }, { status: 500 });
  }
}
