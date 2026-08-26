import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export type Supplier = {
  id: string;
  restaurant_id: string | null;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  product_count?: number;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurant_id');

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (restaurantId) { conditions.push(`s.restaurant_id = $${idx++}`); values.push(restaurantId); }
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await getPool().query<Supplier>(
      `SELECT s.id, s.restaurant_id, s.name, s.contact_name, s.contact_phone, s.contact_email,
              s.notes, s.active, s.created_at,
              COUNT(p.id)::int as product_count
       FROM suppliers s
       LEFT JOIN inventory_products p ON p.supplier_id = s.id
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.name ASC`,
      values
    );
    return NextResponse.json({ suppliers: rows });
  } catch (err) {
    console.error('[/api/admin/inventory/suppliers GET]', err);
    return NextResponse.json({ error: 'Error al obtener proveedores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { restaurant_id, name, contact_name, contact_phone, contact_email, notes } = body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del proveedor es requerido' }, { status: 400 });
    }

    const id = randomUUID();
    const { rows } = await getPool().query<Supplier>(
      `INSERT INTO suppliers (id, restaurant_id, name, contact_name, contact_phone, contact_email, notes, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, restaurant_id, name, contact_name, contact_phone, contact_email, notes, active, created_at`,
      [id, restaurant_id ?? null, name.trim(), contact_name?.trim() || null, contact_phone?.trim() || null, contact_email?.trim() || null, notes?.trim() || null]
    );

    return NextResponse.json({ supplier: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[/api/admin/inventory/suppliers POST]', err);
    return NextResponse.json({ error: 'Error al crear proveedor' }, { status: 500 });
  }
}
