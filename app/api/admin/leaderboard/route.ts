import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

type Period = 'today' | 'week' | 'month';

function periodStartExpr(period: Period): string {
  // SQL expression (no params) for the start timestamp of the requested period.
  if (period === 'today') return `date_trunc('day', NOW())`;
  if (period === 'week') return `date_trunc('week', NOW())`;
  return `date_trunc('month', NOW())`;
}

export async function GET(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  // Leaderboard shows aggregate COUNTS ONLY per restaurant (no customer-level
  // detail), so it's safe for managers to see all restaurants ranked even
  // though managers are normally scoped to their own restaurant's data.
  if (session.role !== 'admin' && session.role !== 'manager') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const periodParam = (searchParams.get('period') ?? 'today') as Period;
  const period: Period = ['today', 'week', 'month'].includes(periodParam) ? periodParam : 'today';
  const periodStart = periodStartExpr(period);

  const pool = getPool();

  try {
    // Single query, one row per restaurant, using subqueries/JOINs (no N+1 looping):
    //  - claims_count: ticket_claims rows for this restaurant within the period
    //  - sales_total: sum of daily_sales.total_amount for sale_date within the period
    //  - new_customers: distinct phones whose FIRST EVER ticket_claims claim falls in the period
    //
    // Score formula (documented, weights are intentionally simple/explainable):
    //   score = claims_count * 10 + new_customers * 25 + (sales_total / 100)
    const { rows } = await pool.query<{
      id: string;
      name: string;
      claims_count: string;
      sales_total: string;
      new_customers: string;
    }>(
      `
      WITH first_claims AS (
        SELECT restaurant_id, phone, MIN(claimed_at) AS first_claimed_at
        FROM ticket_claims
        GROUP BY restaurant_id, phone
      )
      SELECT
        r.id,
        r.name,
        COUNT(DISTINCT tc.id) FILTER (
          WHERE tc.claimed_at >= ${periodStart}
        )::text AS claims_count,
        COALESCE(SUM(ds.total_amount) FILTER (
          WHERE ds.sale_date >= ${periodStart}::date
        ), 0)::text AS sales_total,
        COUNT(DISTINCT fc.phone) FILTER (
          WHERE fc.first_claimed_at >= ${periodStart}
        )::text AS new_customers
      FROM restaurants r
      LEFT JOIN ticket_claims tc ON tc.restaurant_id = r.id
      LEFT JOIN daily_sales ds ON ds.restaurant_id = r.id
      LEFT JOIN first_claims fc ON fc.restaurant_id = r.id
      GROUP BY r.id, r.name
      `
    );

    const restaurants = rows
      .map((r) => {
        const claims_count = parseInt(r.claims_count, 10) || 0;
        const sales_total = parseFloat(r.sales_total) || 0;
        const new_customers = parseInt(r.new_customers, 10) || 0;
        const score = Math.round(claims_count * 10 + new_customers * 25 + sales_total / 100);
        return {
          id: r.id,
          name: r.name,
          claims_count,
          sales_total,
          new_customers,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));

    return NextResponse.json({
      period,
      restaurants,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[/api/admin/leaderboard]', err);
    return NextResponse.json({ error: 'Error al consultar el ranking' }, { status: 500 });
  }
}
