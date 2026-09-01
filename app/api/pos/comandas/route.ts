import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

// GET /api/pos/comandas — comandas activas para la pantalla de cocina/almacén.
// Ambas pantallas ven exactamente lo mismo: cada venta completa del TPV.
export async function GET() {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT s.id, s.employee_name, s.total_amount, s.payment_method, s.status, s.created_at,
            COALESCE(json_agg(json_build_object('product_name', i.product_name, 'quantity', i.quantity, 'unit', i.unit) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
     FROM pos_sales s
     LEFT JOIN pos_sale_items i ON i.sale_id = s.id
     WHERE s.cancelled_at IS NULL
       AND s.created_at > NOW() - INTERVAL '18 hours'
       AND (s.status != 'entregado' OR s.status_updated_at > NOW() - INTERVAL '10 minutes')
     GROUP BY s.id
     ORDER BY s.created_at ASC`
  );

  return NextResponse.json({ comandas: rows });
}
