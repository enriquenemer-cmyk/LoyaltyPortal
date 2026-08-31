import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type SummaryRow = {
  id: string;
  name: string;
  code: string | null;
  unit: string;
  current_stock: string;
  total_in: string;
  total_out: string;
};

// GET /api/admin/inventory/summary — por cada producto activo: nombre,
// código, cuánto entró en total, cuánto salió en total, y el stock actual.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurant_id');

  const conditions = ['p.active = true'];
  const values: unknown[] = [];
  let idx = 1;
  if (restaurantId) {
    conditions.push(`p.restaurant_id = $${idx++}`);
    values.push(restaurantId);
  }

  try {
    const { rows } = await getPool().query<SummaryRow>(
      `SELECT p.id, p.name, p.code, p.unit, p.current_stock,
              COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'entrada'), 0) AS total_in,
              COALESCE(SUM(m.quantity) FILTER (WHERE m.type = 'salida'), 0) AS total_out
       FROM inventory_products p
       LEFT JOIN inventory_movements m ON m.product_id = p.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY p.id
       ORDER BY p.name`,
      values
    );
    return NextResponse.json({ summary: rows });
  } catch (err) {
    console.error('[/api/admin/inventory/summary GET]', err);
    return NextResponse.json({ error: 'Error al obtener el resumen' }, { status: 500 });
  }
}
