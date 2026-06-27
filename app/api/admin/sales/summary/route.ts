import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type DayTotal = { date: string; total: number };

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function startOfWeek(d: Date): Date {
  // Monday as start of week
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export async function GET() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();

  try {
    const now = new Date();
    const today = isoDate(now);

    const weekStart = startOfWeek(now);
    const weekStartStr = isoDate(weekStart);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekStartStr = isoDate(prevWeekStart);
    const prevWeekEndStr = isoDate(new Date(weekStart.getTime() - 1));

    const monthStart = startOfMonth(now);
    const monthStartStr = isoDate(monthStart);
    const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
    const prevMonthStartStr = isoDate(prevMonthStart);
    const prevMonthEndStr = isoDate(new Date(monthStart.getTime() - 1));

    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    const fourteenDaysAgoStr = isoDate(fourteenDaysAgo);

    const [
      todayResult,
      weekResult,
      prevWeekResult,
      monthResult,
      prevMonthResult,
      last14Result,
    ] = await Promise.all([
      pool.query<{ total: string | null }>(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM daily_sales WHERE sale_date = $1`,
        [today]
      ),
      pool.query<{ total: string | null }>(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM daily_sales WHERE sale_date >= $1 AND sale_date <= $2`,
        [weekStartStr, today]
      ),
      pool.query<{ total: string | null }>(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM daily_sales WHERE sale_date >= $1 AND sale_date <= $2`,
        [prevWeekStartStr, prevWeekEndStr]
      ),
      pool.query<{ total: string | null }>(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM daily_sales WHERE sale_date >= $1 AND sale_date <= $2`,
        [monthStartStr, today]
      ),
      pool.query<{ total: string | null }>(
        `SELECT COALESCE(SUM(total_amount), 0) AS total FROM daily_sales WHERE sale_date >= $1 AND sale_date <= $2`,
        [prevMonthStartStr, prevMonthEndStr]
      ),
      pool.query<{ sale_date: string; total: string | null }>(
        `SELECT sale_date, COALESCE(SUM(total_amount), 0) AS total
         FROM daily_sales
         WHERE sale_date >= $1 AND sale_date <= $2
         GROUP BY sale_date
         ORDER BY sale_date ASC`,
        [fourteenDaysAgoStr, today]
      ),
    ]);

    const todayTotal = Number(todayResult.rows[0]?.total ?? 0);
    const weekTotal = Number(weekResult.rows[0]?.total ?? 0);
    const prevWeekTotal = Number(prevWeekResult.rows[0]?.total ?? 0);
    const monthTotal = Number(monthResult.rows[0]?.total ?? 0);
    const prevMonthTotal = Number(prevMonthResult.rows[0]?.total ?? 0);

    // Build a complete 14-day series, filling missing days with 0
    const totalsByDate = new Map<string, number>();
    for (const row of last14Result.rows) {
      totalsByDate.set(row.sale_date.slice(0, 10), Number(row.total ?? 0));
    }
    const last14Days: DayTotal[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = isoDate(d);
      last14Days.push({ date: iso, total: totalsByDate.get(iso) ?? 0 });
    }

    return NextResponse.json({
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      weekChangePct: pctChange(weekTotal, prevWeekTotal),
      monthChangePct: pctChange(monthTotal, prevMonthTotal),
      last14Days,
    });
  } catch (err) {
    console.error('[/api/admin/sales/summary GET]', err);
    return NextResponse.json({ error: 'Error al obtener el resumen de ventas' }, { status: 500 });
  }
}
