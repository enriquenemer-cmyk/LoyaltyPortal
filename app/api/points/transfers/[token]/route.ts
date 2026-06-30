import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureSchema();
  const pool = getPool();

  const { rows: customerRows } = await pool.query(
    `SELECT phone FROM customer_points WHERE public_token = $1`,
    [token]
  );
  const customer = customerRows[0];
  if (!customer) {
    return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });
  }

  const { rows: sent } = await pool.query(
    `SELECT t.id, t.to_phone AS other_phone, COALESCE(cp.full_name, t.to_phone) AS other_name,
            t.points, t.message, t.created_at
     FROM point_transfers t
     LEFT JOIN customer_points cp ON cp.phone = t.to_phone
     WHERE t.from_phone = $1
     ORDER BY t.created_at DESC LIMIT 20`,
    [customer.phone]
  );

  const { rows: received } = await pool.query(
    `SELECT t.id, t.from_phone AS other_phone, COALESCE(cp.full_name, t.from_phone) AS other_name,
            t.points, t.message, t.created_at
     FROM point_transfers t
     LEFT JOIN customer_points cp ON cp.phone = t.from_phone
     WHERE t.to_phone = $1
     ORDER BY t.created_at DESC LIMIT 20`,
    [customer.phone]
  );

  return NextResponse.json({ sent, received });
}
