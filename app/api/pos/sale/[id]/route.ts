import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// GET /api/pos/sale/[id] — detalle completo de una venta (para imprimir la
// factura/recibo). Accesible tanto por el cajero que la hizo como por un
// administrador, para poder reimprimir desde Ventas Diarias.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const employeeSession = await getEmployeeSession();
  const adminSession = await getSession();
  if (!employeeSession.employeeId && !adminSession.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const pool = getPool();
    const { rows: [sale] } = await pool.query(
      `SELECT s.id, s.total_amount, s.payment_method, s.employee_name, s.cancelled_at, s.created_at,
              s.table_name,
              r.name AS restaurant_name, r.address AS restaurant_address, r.phone AS restaurant_phone, r.logo_url AS restaurant_logo
       FROM pos_sales s
       LEFT JOIN restaurants r ON r.id = s.restaurant_id
       WHERE s.id = $1`,
      [id]
    );
    if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

    const { rows: items } = await pool.query(
      `SELECT product_name, product_type, unit, quantity, unit_price, subtotal
       FROM pos_sale_items WHERE sale_id = $1 ORDER BY id`,
      [id]
    );

    const { rows: payments } = await pool.query(
      `SELECT method, amount FROM pos_sale_payments WHERE sale_id = $1 ORDER BY created_at`,
      [id]
    );

    return NextResponse.json({ sale: { ...sale, items, payments } });
  } catch (err) {
    console.error('[/api/pos/sale/[id] GET]', err);
    return NextResponse.json({ error: 'Error al obtener la venta' }, { status: 500 });
  }
}
