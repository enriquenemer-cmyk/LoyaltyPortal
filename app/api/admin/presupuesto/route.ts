import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL,
      month TEXT NOT NULL,
      category TEXT NOT NULL,
      budgeted NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(restaurant_id, month, category)
    )
  `).catch(() => {});

  const month = new Date().toISOString().slice(0, 7);
  const { rows: budget } = await pool.query(
    `SELECT b.category, b.budgeted::text,
            COALESCE(SUM(ae.amount),0)::text AS actual
     FROM budget_items b
     LEFT JOIN accounting_entries ae
       ON ae.restaurant_id = b.restaurant_id
       AND ae.category = b.category
       AND ae.type = 'expense'
       AND TO_CHAR(ae.date, 'YYYY-MM') = b.month
     WHERE b.restaurant_id = $1 AND b.month = $2
     GROUP BY b.category, b.budgeted`,
    [restaurantId, month]
  );
  return NextResponse.json({ month, budget });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;

  const body = await req.json();
  const pool = getPool();
  const month = body.month ?? new Date().toISOString().slice(0, 7);

  await pool.query(
    `INSERT INTO budget_items (restaurant_id, month, category, budgeted)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (restaurant_id, month, category) DO UPDATE SET budgeted=$4`,
    [restaurantId, month, body.category, body.budgeted]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;
  const { category, month } = await req.json();
  const pool = getPool();
  await pool.query(
    `DELETE FROM budget_items WHERE restaurant_id=$1 AND month=$2 AND category=$3`,
    [restaurantId, month, category]
  );
  return NextResponse.json({ ok: true });
}
