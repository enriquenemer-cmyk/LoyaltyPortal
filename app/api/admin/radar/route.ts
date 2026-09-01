import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pool = getPool();
    const restaurantId = session.restaurantId ?? null;

    const [
      todayClaimsRes,
      pendingRes,
      activeEmployeesRes,
      recentActivityRes,
      hourlyRes,
      vipRes,
    ] = await Promise.all([
      // Claims today
      pool.query<{ count: string; last_hour: string }>(
        `SELECT
           COUNT(*)::text AS count,
           COUNT(*) FILTER (WHERE claimed_at >= NOW() - INTERVAL '1 hour')::text AS last_hour
         FROM claims
         WHERE DATE(claimed_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE AT TIME ZONE 'America/Mexico_City'
           ${restaurantId ? `AND prize_id IN (SELECT id FROM prizes WHERE restaurant_id = $1)` : ''}`
        , restaurantId ? [restaurantId] : []
      ),
      // Pending deliveries
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM claims WHERE status = 'pending'
         ${restaurantId ? `AND prize_id IN (SELECT id FROM prizes WHERE restaurant_id = $1)` : ''}`
        , restaurantId ? [restaurantId] : []
      ),
      // Employees currently clocked in
      pool.query<{ count: string; employees: string }>(
        `SELECT
           COUNT(*)::text AS count,
           STRING_AGG(e.full_name, ', ' ORDER BY tc.clock_in) AS employees
         FROM time_clock_entries tc
         JOIN employees e ON e.id = tc.employee_id
         WHERE tc.is_active = true
           ${restaurantId ? `AND e.restaurant_id = $1` : ''}`
        , restaurantId ? [restaurantId] : []
      ),
      // Recent activity (last 20 events)
      pool.query<{ action: string; description: string; user_name: string; created_at: string }>(
        `SELECT action, description, user_name, created_at
         FROM activity_log
         ${restaurantId ? `WHERE restaurant_id = $1` : ''}
         ORDER BY created_at DESC LIMIT 20`
        , restaurantId ? [restaurantId] : []
      ),
      // Claims by hour today
      pool.query<{ hour: number; count: string }>(
        `SELECT
           EXTRACT(HOUR FROM claimed_at AT TIME ZONE 'America/Mexico_City')::int AS hour,
           COUNT(*)::text AS count
         FROM claims
         WHERE DATE(claimed_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE AT TIME ZONE 'America/Mexico_City'
           ${restaurantId ? `AND prize_id IN (SELECT id FROM prizes WHERE restaurant_id = $1)` : ''}
         GROUP BY hour ORDER BY hour`
        , restaurantId ? [restaurantId] : []
      ),
      // VIP customers who visited today
      pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT c.phone)::text AS count
         FROM claims c
         JOIN customer_points cp ON cp.phone = c.phone
         WHERE cp.tier = 'gold'
           AND DATE(c.claimed_at AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE AT TIME ZONE 'America/Mexico_City'`
      ),
    ]);

    return NextResponse.json({
      today_claims: parseInt(todayClaimsRes.rows[0]?.count ?? '0', 10),
      last_hour_claims: parseInt(todayClaimsRes.rows[0]?.last_hour ?? '0', 10),
      pending_deliveries: parseInt(pendingRes.rows[0]?.count ?? '0', 10),
      active_employees: parseInt(activeEmployeesRes.rows[0]?.count ?? '0', 10),
      active_employee_names: activeEmployeesRes.rows[0]?.employees ?? null,
      vip_visits_today: parseInt(vipRes.rows[0]?.count ?? '0', 10),
      recent_activity: recentActivityRes.rows,
      hourly_claims: hourlyRes.rows,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Radar error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
