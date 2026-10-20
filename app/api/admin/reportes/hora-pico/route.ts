import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// GET /api/admin/reportes/hora-pico?days= — ventas reales del POS agrupadas
// por hora del día y por día de la semana, para saber cuándo vende más el
// negocio y planear personal en consecuencia.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const days = Math.min(Math.max(parseInt(new URL(req.url).searchParams.get('days') ?? '30', 10) || 30, 1), 90);

    const pool = getPool();
    const [byHourRes, byDayRes] = await Promise.all([
      pool.query(
        `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count, COALESCE(SUM(total_amount),0)::text AS total
         FROM pos_sales
         WHERE restaurant_id IS NOT DISTINCT FROM $1 AND cancelled_at IS NULL AND created_at > NOW() - ($2 || ' days')::interval
         GROUP BY hour ORDER BY hour`,
        [restaurantId, days]
      ),
      pool.query(
        `SELECT EXTRACT(DOW FROM created_at)::int AS dow, COUNT(*)::int AS count, COALESCE(SUM(total_amount),0)::text AS total
         FROM pos_sales
         WHERE restaurant_id IS NOT DISTINCT FROM $1 AND cancelled_at IS NULL AND created_at > NOW() - ($2 || ' days')::interval
         GROUP BY dow ORDER BY dow`,
        [restaurantId, days]
      ),
    ]);

    const byHour = Array.from({ length: 24 }, (_, hour) => {
      const row = byHourRes.rows.find((r) => r.hour === hour);
      return { hour, count: row?.count ?? 0, total: row ? Number(row.total) : 0 };
    });
    const byDay = Array.from({ length: 7 }, (_, dow) => {
      const row = byDayRes.rows.find((r) => r.dow === dow);
      return { dow, label: DAY_LABELS[dow], count: row?.count ?? 0, total: row ? Number(row.total) : 0 };
    });

    const peakHour = byHour.reduce((best, h) => (h.total > best.total ? h : best), byHour[0]);
    const peakDay = byDay.reduce((best, d) => (d.total > best.total ? d : best), byDay[0]);

    return NextResponse.json({ days, by_hour: byHour, by_day: byDay, peak_hour: peakHour, peak_day: peakDay });
  } catch (err) {
    console.error('[/api/admin/reportes/hora-pico GET]', err);
    return NextResponse.json({ error: 'Error al calcular las horas pico' }, { status: 500 });
  }
}
