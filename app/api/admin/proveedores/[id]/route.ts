import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;
  const { id } = await params;
  const pool = getPool();
  await pool.query(`DELETE FROM suppliers WHERE id=$1 AND restaurant_id=$2`, [id, restaurantId]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;
  const { id } = await params;
  const body = await req.json();
  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE suppliers SET name=$1, contact_name=$2, contact_phone=$3, contact_email=$4, notes=$5 WHERE id=$6 AND restaurant_id=$7 RETURNING *`,
    [body.name, body.contact_name ?? null, body.phone ?? null, body.email ?? null, body.notes ?? null, id, restaurantId]
  );
  return NextResponse.json(rows[0]);
}
