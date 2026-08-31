import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type InventoryProduct = {
  id: string;
  restaurant_id: string | null;
  name: string;
  code: string | null;
  unit: string;
  description: string | null;
  current_stock: string;
  min_stock_alert: string;
  active: boolean;
  created_at: string;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, unit, min_stock_alert, active, description, code } = body ?? {};

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (unit !== undefined) {
      fields.push(`unit = $${idx++}`);
      values.push(unit);
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (code !== undefined) {
      fields.push(`code = $${idx++}`);
      values.push(code);
    }
    if (min_stock_alert !== undefined) {
      fields.push(`min_stock_alert = $${idx++}`);
      values.push(min_stock_alert);
    }
    if (active !== undefined) {
      fields.push(`active = $${idx++}`);
      values.push(active);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
    }

    values.push(id);

    const pool = getPool();
    const result = await pool.query<InventoryProduct>(
      `UPDATE inventory_products SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, restaurant_id, name, code, unit, description, current_stock, min_stock_alert, active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ product: result.rows[0] });
  } catch (err) {
    console.error('[/api/admin/inventory/products/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pool = getPool();
    const result = await pool.query<InventoryProduct>(
      `UPDATE inventory_products SET active = false WHERE id = $1 RETURNING id, restaurant_id, name, unit, current_stock, min_stock_alert, active, created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ product: result.rows[0] });
  } catch (err) {
    console.error('[/api/admin/inventory/products/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}
