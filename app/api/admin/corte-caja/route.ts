import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureAccountingSchema();
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();
  const [incomeRes, expenseRes, posRes, claimsRes, byMethodRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount),0)::text AS total FROM accounting_entries
       WHERE restaurant_id IS NOT DISTINCT FROM $1 AND type='income' AND date=CURRENT_DATE`,
      [restaurantId]
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount),0)::text AS total FROM accounting_entries
       WHERE restaurant_id IS NOT DISTINCT FROM $1 AND type='expense' AND date=CURRENT_DATE`,
      [restaurantId]
    ),
    pool.query<{ count: string; total: string }>(
      `SELECT COUNT(*)::text AS count, COALESCE(SUM(total_amount),0)::text AS total
       FROM pos_sales WHERE restaurant_id IS NOT DISTINCT FROM $1 AND created_at::date=CURRENT_DATE AND cancelled_at IS NULL`,
      [restaurantId]
    ).catch(() => ({ rows: [{ count: '0', total: '0' }] })),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM claims c
       JOIN prizes p ON p.id = c.prize_id
       WHERE p.restaurant_id IS NOT DISTINCT FROM $1 AND c.claimed_at::date=CURRENT_DATE`,
      [restaurantId]
    ).catch(() => ({ rows: [{ count: '0' }] })),
    pool.query<{ payment_method: string; total: string; count: string }>(
      `SELECT payment_method, COUNT(*)::text AS count, COALESCE(SUM(total_amount),0)::text AS total
       FROM pos_sales WHERE restaurant_id IS NOT DISTINCT FROM $1 AND created_at::date=CURRENT_DATE AND cancelled_at IS NULL
       GROUP BY payment_method`,
      [restaurantId]
    ).catch(() => ({ rows: [] })),
  ]);

  const income = parseFloat(incomeRes.rows[0]?.total ?? '0');
  const expense = parseFloat(expenseRes.rows[0]?.total ?? '0');

  return NextResponse.json({
    date: new Date().toISOString().slice(0, 10),
    income,
    expense,
    net: income - expense,
    pos_sales: parseInt(posRes.rows[0]?.count ?? '0'),
    pos_total: parseFloat(posRes.rows[0]?.total ?? '0'),
    claims_today: parseInt(claimsRes.rows[0]?.count ?? '0'),
    by_payment_method: byMethodRes.rows,
  });
}

// Registrar cierre de caja (guarda snapshot)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  await ensureAccountingSchema();
  const restaurantId = session.restaurantId ?? null;

  const body = await req.json();
  const pool = getPool();
  await pool.query(
    `INSERT INTO accounting_entries (restaurant_id, date, type, category, amount, description)
     VALUES ($1, CURRENT_DATE, 'expense', 'corte_caja', $2, $3)`,
    [restaurantId, body.diferencia ?? 0, `Corte de caja — diferencia registrada`]
  ).catch(() => {});
  return NextResponse.json({ ok: true });
}
