import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// GET /api/admin/reportes/nomina?from=&to= — estimado de nómina a partir de
// las horas reales fichadas por cada empleado, más comisión por venta si el
// empleado tiene un % configurado. Es un cálculo interno de referencia
// (horas × tarifa + comisión): NO incluye retenciones, prestaciones ni
// ninguna obligación fiscal o legal — eso requiere un sistema de nómina
// certificado para el país correspondiente.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = searchParams.get('to') || new Date().toISOString().slice(0, 10);

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT
         e.id AS employee_id,
         e.full_name,
         e.position,
         e.hourly_rate,
         e.commission_pct,
         COUNT(DISTINCT t.clock_in::date)::int AS days_worked,
         COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(t.clock_out, NOW()) - t.clock_in)) / 3600.0), 0) AS hours_worked,
         COALESCE(s.sales_total, 0) AS sales_total
       FROM employees e
       LEFT JOIN time_clock_entries t
         ON t.employee_id = e.id AND t.clock_in::date BETWEEN $2 AND $3
       LEFT JOIN (
         SELECT employee_id, SUM(total_amount) AS sales_total
         FROM pos_sales
         WHERE cancelled_at IS NULL AND employee_id IS NOT NULL AND created_at::date BETWEEN $2 AND $3
         GROUP BY employee_id
       ) s ON s.employee_id = e.id
       WHERE e.active = TRUE AND e.restaurant_id IS NOT DISTINCT FROM $1
       GROUP BY e.id, s.sales_total
       ORDER BY e.full_name`,
      [restaurantId, from, to]
    );

    const items = rows.map((r) => {
      const hours = Math.round(Number(r.hours_worked) * 100) / 100;
      const rate = r.hourly_rate !== null ? Number(r.hourly_rate) : null;
      const hourlyPay = rate !== null ? Math.round(hours * rate * 100) / 100 : null;
      const commissionPct = r.commission_pct !== null ? Number(r.commission_pct) : null;
      const salesTotal = Number(r.sales_total);
      const commission = commissionPct !== null ? Math.round(salesTotal * (commissionPct / 100) * 100) / 100 : null;
      const grossPay = hourlyPay !== null || commission !== null ? (hourlyPay ?? 0) + (commission ?? 0) : null;
      return {
        employee_id: r.employee_id,
        full_name: r.full_name,
        position: r.position,
        hourly_rate: rate,
        days_worked: r.days_worked,
        hours_worked: hours,
        hourly_pay: hourlyPay,
        commission_pct: commissionPct,
        sales_total: salesTotal,
        commission,
        gross_pay: grossPay,
      };
    });

    const totals = items.reduce(
      (acc, it) => {
        acc.hours += it.hours_worked;
        acc.sales_total += it.sales_total;
        if (it.commission !== null) acc.commission += it.commission;
        if (it.gross_pay !== null) acc.gross_pay += it.gross_pay;
        return acc;
      },
      { hours: 0, sales_total: 0, commission: 0, gross_pay: 0 }
    );

    return NextResponse.json({ from, to, items, totals });
  } catch (err) {
    console.error('[/api/admin/reportes/nomina GET]', err);
    return NextResponse.json({ error: 'Error al calcular la nómina' }, { status: 500 });
  }
}
