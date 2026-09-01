import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

async function ensureLicenseCols() {
  const pool = getPool();
  const cols = [
    `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS billing_plan TEXT DEFAULT 'basic'`,
    `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'active'`,
    `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_ends_at DATE`,
    `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_email TEXT`,
    `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS owner_name TEXT`,
    `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS monthly_price NUMERIC(10,2) DEFAULT 0`,
  ];
  for (const sql of cols) await pool.query(sql).catch(() => {});
}

// GET — list all tenants (super admin only)
export async function GET() {
  const session = await getSession();
  // Only env-level admin (no restaurantId) can manage licenses
  if (!session.username || session.restaurantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  await ensureLicenseCols();
  const pool = getPool();

  const { rows } = await pool.query(`
    SELECT
      r.id, r.name, r.phone, r.owner_name, r.owner_email,
      r.billing_plan, r.billing_status, r.trial_ends_at,
      r.monthly_price, r.notes, r.created_at,
      COUNT(DISTINCT u.id)::int AS user_count,
      COUNT(DISTINCT c.id)::int AS client_count,
      COUNT(DISTINCT cl.id)::int AS claim_count,
      u_main.username AS main_username
    FROM restaurants r
    LEFT JOIN users u ON u.restaurant_id = r.id
    LEFT JOIN clients c ON c.restaurant_id = r.id
    LEFT JOIN claims cl ON cl.restaurant_id = r.id
    LEFT JOIN users u_main ON u_main.restaurant_id = r.id AND u_main.role = 'manager'
    GROUP BY r.id, u_main.username
    ORDER BY r.created_at DESC
  `);

  return NextResponse.json(rows);
}

// POST — create new tenant (restaurant + user)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username || session.restaurantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  await ensureLicenseCols();
  const body = await req.json();
  const {
    restaurant_name, address, phone, owner_name, owner_email,
    username, password, billing_plan = 'basic', monthly_price = 0,
    trial_ends_at, notes,
  } = body;

  if (!restaurant_name || !username || !password) {
    return NextResponse.json({ error: 'Nombre, usuario y contraseña son requeridos' }, { status: 400 });
  }

  const pool = getPool();
  const restaurantId = randomUUID();
  const userId = randomUUID();
  const hash = await bcrypt.hash(password, 10);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO restaurants (id, name, address, phone, owner_name, owner_email, billing_plan, billing_status, trial_ends_at, monthly_price, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10)`,
      [restaurantId, restaurant_name, address ?? '', phone ?? null,
       owner_name ?? null, owner_email ?? null, billing_plan,
       trial_ends_at ?? null, monthly_price, notes ?? null]
    );
    await client.query(
      `INSERT INTO users (id, username, password_hash, role, restaurant_id)
       VALUES ($1,$2,$3,'manager',$4)`,
      [userId, username, hash, restaurantId]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    const msg = (e as { message?: string }).message ?? '';
    if (msg.includes('unique')) return NextResponse.json({ error: 'El usuario ya existe' }, { status: 409 });
    throw e;
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true, restaurant_id: restaurantId });
}
