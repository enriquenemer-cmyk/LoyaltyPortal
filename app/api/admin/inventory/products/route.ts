import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type InventoryProduct = {
  id: string;
  restaurant_id: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
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
  const supplierId = searchParams.get('supplier_id');

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (restaurantId) { conditions.push(`p.restaurant_id = $${idx++}`); values.push(restaurantId); }
  if (supplierId) { conditions.push(`p.supplier_id = $${idx++}`); values.push(supplierId); }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const result = await getPool().query<InventoryProduct>(
      `SELECT p.id, p.restaurant_id, p.supplier_id, s.name as supplier_name, p.name, p.unit,
              p.current_stock, p.min_stock_alert, p.active, p.created_at
       FROM inventory_products p
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ${whereClause}
       ORDER BY p.created_at DESC`,
      values
    );

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
    const { restaurant_id, supplier_id, name, unit, min_stock_alert } = body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const pool = getPool();
    const id = randomUUID();
    const result = await pool.query<InventoryProduct>(
      `INSERT INTO inventory_products (id, restaurant_id, supplier_id, name, unit, current_stock, min_stock_alert, active)
       VALUES ($1, $2, $3, $4, $5, 0, $6, true)
       RETURNING id, restaurant_id, supplier_id, name, unit, current_stock, min_stock_alert, active, created_at`,
      [id, restaurant_id ?? null, supplier_id ?? null, name.trim(), unit && typeof unit === 'string' && unit.trim() ? unit.trim() : 'unidad', min_stock_alert ?? 0]
    );

    return NextResponse.json({ product: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[/api/admin/inventory/products POST]', err);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}
