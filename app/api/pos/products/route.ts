import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

// GET /api/pos/products — artículos vendibles en el punto de venta: solo
// productos activos con un precio de venta configurado por el admin.
export async function GET() {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const conditions = ['p.active = TRUE', 'p.sale_price IS NOT NULL'];
  const values: unknown[] = [];
  if (session.restaurantId) {
    conditions.push(`(p.restaurant_id = $1 OR p.restaurant_id IS NULL)`);
    values.push(session.restaurantId);
  }

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.unit, p.current_stock, p.sale_price
     FROM inventory_products p
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.name ASC`,
    values
  );

  return NextResponse.json({ products: rows });
}
