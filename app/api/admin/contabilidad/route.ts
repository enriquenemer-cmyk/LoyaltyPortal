import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.restaurantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const pool = getPool();
  const url = new URL(req.url);
  const period = url.searchParams.get('period') ?? 'month'; // week | month | year

  let interval = '30 days';
  if (period === 'week') interval = '7 days';
  if (period === 'year') interval = '365 days';

  const [incomeRes, expenseRes, byDayRes, byCategRes, recentRes] = await Promise.all([
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount),0)::text AS total FROM accounting_entries
       WHERE restaurant_id=$1 AND type='income' AND date >= CURRENT_DATE - $2::interval`,
      [session.restaurantId, interval]
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount),0)::text AS total FROM accounting_entries
       WHERE restaurant_id=$1 AND type='expense' AND date >= CURRENT_DATE - $2::interval`,
      [session.restaurantId, interval]
    ),
    pool.query<{ date: string; income: string; expense: string }>(
      `SELECT date::text,
              COALESCE(SUM(amount) FILTER (WHERE type='income'), 0)::text AS income,
              COALESCE(SUM(amount) FILTER (WHERE type='expense'), 0)::text AS expense
       FROM accounting_entries
       WHERE restaurant_id=$1 AND date >= CURRENT_DATE - $2::interval
       GROUP BY date ORDER BY date`,
      [session.restaurantId, interval]
    ),
    pool.query<{ category: string; type: string; total: string }>(
      `SELECT category, type, COALESCE(SUM(amount),0)::text AS total
       FROM accounting_entries
       WHERE restaurant_id=$1 AND date >= CURRENT_DATE - $2::interval
       GROUP BY category, type ORDER BY total DESC`,
      [session.restaurantId, interval]
    ),
    pool.query<{ id: string; date: string; type: string; category: string; amount: string; description: string }>(
      `SELECT id, date::text, type, category, amount::text, description
       FROM accounting_entries
       WHERE restaurant_id=$1
       ORDER BY date DESC, created_at DESC LIMIT 30`,
      [session.restaurantId]
    ),
  ]);

  const income = parseFloat(incomeRes.rows[0]?.total ?? '0');
  const expense = parseFloat(expenseRes.rows[0]?.total ?? '0');
  const profit = income - expense;
  const margin = income > 0 ? Math.round((profit / income) * 10000) / 100 : 0;

  return NextResponse.json({
    income,
    expense,
    profit,
    margin,
    by_day: byDayRes.rows,
    by_category: byCategRes.rows,
    recent: recentRes.rows,
  });
}

// Manual income/expense entry
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.restaurantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const pool = getPool();
  const { rows: [entry] } = await pool.query(
    `INSERT INTO accounting_entries (restaurant_id, date, type, category, amount, description)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      session.restaurantId,
      body.date ?? new Date().toISOString().slice(0, 10),
      body.type,
      body.category ?? 'general',
      body.amount,
      body.description ?? null,
    ]
  );
  return NextResponse.json(entry);
}
