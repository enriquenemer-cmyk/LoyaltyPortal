import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { license_key } = body;

  if (!license_key) {
    return NextResponse.json({ valid: false, reason: 'Clave no proporcionada' }, { status: 400 });
  }

  const pool = getPool();

  // Ensure license_key column exists
  await pool.query(
    `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS license_key TEXT UNIQUE`
  ).catch(() => {});

  const { rows: [restaurant] } = await pool.query(
    `SELECT id, name, billing_status, billing_plan FROM restaurants WHERE license_key = $1`,
    [license_key]
  );

  if (!restaurant) {
    return NextResponse.json({ valid: false, reason: 'Clave de licencia inválida' }, { status: 404 });
  }

  if (restaurant.billing_status === 'blocked') {
    return NextResponse.json({
      valid: false,
      reason: 'Tu licencia ha sido suspendida por falta de pago. Contacta a 3E: enriquenemer@gmail.com',
      restaurant_name: restaurant.name,
    }, { status: 403 });
  }

  return NextResponse.json({
    valid: true,
    restaurant_id: restaurant.id,
    restaurant_name: restaurant.name,
    plan: restaurant.billing_plan,
    validated_at: new Date().toISOString(),
  });
}
