import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();

  // Avg daily income last 30 days
  const [incomeAvgRes, expenseAvgRes, cxpRes, budgetRes] = await Promise.all([
    pool.query<{ daily_avg: string }>(
      `SELECT COALESCE(SUM(amount)/30.0, 0)::text AS daily_avg
       FROM accounting_entries
       WHERE restaurant_id=$1 AND type='income' AND date >= CURRENT_DATE - interval '30 days'`,
      [restaurantId]
    ),
    pool.query<{ daily_avg: string }>(
      `SELECT COALESCE(SUM(amount)/30.0, 0)::text AS daily_avg
       FROM accounting_entries
       WHERE restaurant_id=$1 AND type='expense' AND date >= CURRENT_DATE - interval '30 days'`,
      [restaurantId]
    ),
    pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(total),0)::text AS total
       FROM supplier_purchases
       WHERE restaurant_id=$1 AND payment_status='pendiente'`,
      [restaurantId]
    ).catch(() => ({ rows: [{ total: '0' }] })),
    pool.query<{ category: string; budgeted: string }>(
      `SELECT category, budgeted::text FROM budget_items
       WHERE restaurant_id=$1 AND month=TO_CHAR(CURRENT_DATE,'YYYY-MM')`,
      [restaurantId]
    ).catch(() => ({ rows: [] })),
  ]);

  const dailyIncome = parseFloat(incomeAvgRes.rows[0]?.daily_avg ?? '0');
  const dailyExpense = parseFloat(expenseAvgRes.rows[0]?.daily_avg ?? '0');
  const pendingPayables = parseFloat(cxpRes.rows[0]?.total ?? '0');
  const dailyNet = dailyIncome - dailyExpense;

  // 30-day projection
  const projection = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return {
      date: date.toISOString().slice(0, 10),
      projected_income: Math.round(dailyIncome * 100) / 100,
      projected_expense: Math.round(dailyExpense * 100) / 100,
      projected_net: Math.round(dailyNet * 100) / 100,
      cumulative: Math.round(dailyNet * (i + 1) * 100) / 100,
    };
  });

  return NextResponse.json({
    daily_income_avg: dailyIncome,
    daily_expense_avg: dailyExpense,
    daily_net_avg: dailyNet,
    monthly_projection: dailyNet * 30,
    pending_payables: pendingPayables,
    budget: budgetRes.rows,
    projection,
  });
}
