import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from'); // YYYY-MM-DD
  const to = searchParams.get('to');     // YYYY-MM-DD

  const pool = getPool();

  // Build date conditions
  const fromClause = from ? `AND tc.claimed_at >= $1::date` : '';
  const toClause = to ? `AND tc.claimed_at < ($${from ? 2 : 1}::date + INTERVAL '1 day')` : '';
  const params: string[] = [];
  if (from) params.push(from);
  if (to) params.push(to);

  try {
    // Global KPI: totals across all restaurants using ticket_claims
    const todayCondition = `tc.claimed_at >= CURRENT_DATE AND tc.claimed_at < CURRENT_DATE + INTERVAL '1 day'`;
    const weekCondition = `tc.claimed_at >= date_trunc('week', NOW()) AND tc.claimed_at < date_trunc('week', NOW()) + INTERVAL '7 days'`;

    const { rows: globalRows } = await pool.query<{
      cobros_hoy: string;
      cobros_semana: string;
      clientes_unicos: string;
      ticket_promedio: string;
    }>(`
      SELECT
        COUNT(*) FILTER (WHERE ${todayCondition})::text AS cobros_hoy,
        COUNT(*) FILTER (WHERE ${weekCondition})::text AS cobros_semana,
        COUNT(DISTINCT tc.phone)::text AS clientes_unicos,
        ROUND(AVG(tc.amount), 2)::text AS ticket_promedio
      FROM ticket_claims tc
    `);

    // Per-restaurant stats
    const filterConditions = [fromClause, toClause].filter(Boolean).join(' ');
    const { rows: byRestaurant } = await pool.query<{
      restaurant_id: string;
      restaurant_name: string;
      cobros_hoy: string;
      cobros_semana: string;
      clientes_unicos: string;
      ultimo_cobro: string | null;
    }>(`
      SELECT
        r.id AS restaurant_id,
        r.name AS restaurant_name,
        COUNT(tc.id) FILTER (WHERE tc.claimed_at >= CURRENT_DATE AND tc.claimed_at < CURRENT_DATE + INTERVAL '1 day')::text AS cobros_hoy,
        COUNT(tc.id) FILTER (WHERE tc.claimed_at >= date_trunc('week', NOW()) AND tc.claimed_at < date_trunc('week', NOW()) + INTERVAL '7 days')::text AS cobros_semana,
        COUNT(DISTINCT tc.phone)::text AS clientes_unicos,
        MAX(tc.claimed_at)::text AS ultimo_cobro
      FROM restaurants r
      LEFT JOIN ticket_claims tc ON tc.restaurant_id = r.id ${filterConditions}
      GROUP BY r.id, r.name
      ORDER BY r.name ASC
    `, params);

    const global = globalRows[0] ?? { cobros_hoy: '0', cobros_semana: '0', clientes_unicos: '0', ticket_promedio: '0' };

    return NextResponse.json({
      global: {
        cobros_hoy: parseInt(global.cobros_hoy, 10),
        cobros_semana: parseInt(global.cobros_semana, 10),
        clientes_unicos: parseInt(global.clientes_unicos, 10),
        ticket_promedio: parseFloat(global.ticket_promedio ?? '0'),
      },
      sucursales: byRestaurant.map((r) => ({
        restaurant_id: r.restaurant_id,
        restaurant_name: r.restaurant_name,
        cobros_hoy: parseInt(r.cobros_hoy, 10),
        cobros_semana: parseInt(r.cobros_semana, 10),
        clientes_unicos: parseInt(r.clientes_unicos, 10),
        ultimo_cobro: r.ultimo_cobro ?? null,
      })),
    });
  } catch (err) {
    console.error('[corporativo] DB error:', err);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}
