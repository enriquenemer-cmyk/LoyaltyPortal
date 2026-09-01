import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT s.*,
            COUNT(sp.id)::int AS purchase_count,
            COALESCE(SUM(sp.total), 0)::numeric AS total_spent
     FROM suppliers s
     LEFT JOIN supplier_purchases sp ON sp.supplier_id = s.id
     WHERE s.restaurant_id = $1
     GROUP BY s.id
     ORDER BY s.name`,
    [restaurantId]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;

  const body = await req.json();
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO suppliers (restaurant_id, name, contact_name, contact_phone, contact_email, notes)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [restaurantId, body.name, body.contact_name ?? null, body.phone ?? null, body.email ?? null, body.notes ?? null]
  );
  return NextResponse.json(rows[0]);
}
