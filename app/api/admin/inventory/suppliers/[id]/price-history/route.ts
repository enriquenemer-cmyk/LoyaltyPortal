import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type PriceHistoryRow = {
  id: string;
  product_id: string;
  product_name: string;
  unit: string;
  order_number: string;
  weight: string;
  unit_price: string;
  received_at: string;
};

// GET /api/admin/inventory/suppliers/[id]/price-history — cada entrada con
// precio registrado para productos de este proveedor, más reciente primero,
// para poder ver si un proveedor está subiendo precios con el tiempo.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { rows } = await getPool().query<PriceHistoryRow>(
      `SELECT u.id, u.product_id, p.name as product_name, p.unit, u.order_number, u.weight, u.unit_price, u.received_at
       FROM inventory_units u
       JOIN inventory_products p ON p.id = u.product_id
       WHERE p.supplier_id = $1 AND u.unit_price IS NOT NULL
       ORDER BY u.received_at DESC
       LIMIT 200`,
      [id]
    );
    return NextResponse.json({ history: rows });
  } catch (err) {
    console.error('[/api/admin/inventory/suppliers/[id]/price-history GET]', err);
    return NextResponse.json({ error: 'Error al obtener el historial de precios' }, { status: 500 });
  }
}
