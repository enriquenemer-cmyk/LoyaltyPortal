import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type InventoryProduct = {
  id: string;
  restaurant_id: string | null;
  name: string;
  unit: string;
  current_stock: string;
  min_stock_alert: string;
  active: boolean;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurant_id');

  const pool = getPool();

  try {
    let result;
    if (restaurantId) {
      result = await pool.query<InventoryProduct>(
        `SELECT id, restaurant_id, name, unit, current_stock, min_stock_alert, active, created_at
         FROM inventory_products
         WHERE restaurant_id = $1
         ORDER BY created_at DESC`,
        [restaurantId]
      );
    } else {
      result = await pool.query<InventoryProduct>(
        `SELECT id, restaurant_id, name, unit, current_stock, min_stock_alert, active, created_at
         FROM inventory_products
         ORDER BY created_at DESC`
      );
    }

    return NextResponse.json({ products: result.rows });
  } catch (err) {
    console.error('[/api/admin/inventory/products GET]', err);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { restaurant_id, name, unit, min_stock_alert } = body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const pool = getPool();
    const id = randomUUID();
    const result = await pool.query<InventoryProduct>(
      `INSERT INTO inventory_products (id, restaurant_id, name, unit, current_stock, min_stock_alert, active)
       VALUES ($1, $2, $3, $4, 0, $5, true)
       RETURNING id, restaurant_id, name, unit, current_stock, min_stock_alert, active, created_at`,
      [id, restaurant_id ?? null, name.trim(), unit && typeof unit === 'string' && unit.trim() ? unit.trim() : 'unidad', min_stock_alert ?? 0]
    );

    return NextResponse.json({ product: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[/api/admin/inventory/products POST]', err);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}
