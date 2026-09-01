import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const restaurantId = session.restaurantId ?? null;

  const url = new URL(req.url);
  const period = url.searchParams.get('period') ?? 'month';
  let interval = '30 days';
  if (period === 'week') interval = '7 days';
  if (period === 'year') interval = '365 days';

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT date::text, type, category, amount::text, description, created_at::text
     FROM accounting_entries
     WHERE restaurant_id=$1 AND date >= CURRENT_DATE - $2::interval
     ORDER BY date DESC, created_at DESC`,
    [restaurantId, interval]
  );

  const LABELS: Record<string, string> = {
    compra_proveedor: 'Compra a proveedor', venta: 'Venta', nomina: 'Nómina',
    renta: 'Renta', servicios: 'Servicios', mantenimiento: 'Mantenimiento',
    general: 'General', otro: 'Otro', corte_caja: 'Corte de caja',
  };

  const header = 'Fecha,Tipo,Categoría,Descripción,Monto (MXN)\n';
  const body = rows.map(r =>
    [
      r.date,
      r.type === 'income' ? 'Ingreso' : 'Gasto',
      LABELS[r.category] ?? r.category,
      `"${(r.description ?? '').replace(/"/g, '""')}"`,
      (r.type === 'expense' ? '-' : '') + parseFloat(r.amount).toFixed(2),
    ].join(',')
  ).join('\n');

  return new NextResponse(header + body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contabilidad-3E-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
