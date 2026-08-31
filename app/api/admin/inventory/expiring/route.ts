import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type ExpiringUnit = {
  id: string;
  product_id: string;
  product_name: string;
  unit: string;
  weight: string;
  order_number: string;
  location: string | null;
  expires_at: string;
};

// GET /api/admin/inventory/expiring?days=3 — unidades disponibles que vencen
// dentro de los próximos N días (default 3), o ya vencidas.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const days = parseInt(req.nextUrl.searchParams.get('days') ?? '3', 10) || 3;

  try {
    const { rows } = await getPool().query<ExpiringUnit>(
      `SELECT u.id, u.product_id, p.name as product_name, p.unit, u.weight, u.order_number, u.location, u.expires_at
       FROM inventory_units u
       JOIN inventory_products p ON p.id = u.product_id
       WHERE u.status = 'available' AND u.expires_at IS NOT NULL
         AND u.expires_at <= CURRENT_DATE + INTERVAL '1 day' * $1
       ORDER BY u.expires_at ASC`,
      [days]
    );
    return NextResponse.json({ units: rows });
  } catch (err) {
    console.error('[/api/admin/inventory/expiring GET]', err);
    return NextResponse.json({ error: 'Error al obtener unidades por vencer' }, { status: 500 });
  }
}
