import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone requerido.' }, { status: 400 });
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT point_multiplier, boost_expires_at FROM customer_points WHERE phone = $1', [phone]
  );
  if (!rows[0]) return NextResponse.json({ boost_active: false, multiplier: 1 });
  const now = new Date();
  const active = rows[0].boost_expires_at && new Date(rows[0].boost_expires_at) > now;
  return NextResponse.json({
    boost_active: !!active,
    multiplier: active ? Number(rows[0].point_multiplier) : 1,
    expires_at: rows[0].boost_expires_at,
  });
}

export async function POST(req: NextRequest) {
  const pool = getPool();
  const body = await req.json() as { phone: string; email?: string; days?: number; multiplier?: number };
  const { phone, email, days = 7, multiplier = 2 } = body;
  if (!phone) return NextResponse.json({ error: 'phone requerido.' }, { status: 400 });

  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  await pool.query(
    `INSERT INTO customer_points (id, phone, email, total_points, lifetime_points, tier, point_multiplier, boost_expires_at)
     VALUES ($1,$2,$3,0,0,'bronze',$4,$5)
     ON CONFLICT (phone) DO UPDATE SET point_multiplier = $4, boost_expires_at = $5, updated_at = NOW()`,
    [randomUUID(), phone, email ?? `${phone}@boost.local`, multiplier, expiresAt]
  );

  return NextResponse.json({ ok: true, multiplier, expires_at: expiresAt });
}
