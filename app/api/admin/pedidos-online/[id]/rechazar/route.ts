import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  let body: { reason?: string } = {};
  try {
    body = await req.json();
  } catch {
    // razón es opcional
  }

  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();
    const { rows: [order] } = await pool.query(
      `SELECT status FROM online_orders WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2`,
      [id, restaurantId]
    );
    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    if (order.status !== 'pendiente') {
      return NextResponse.json({ error: 'Solo se puede rechazar un pedido pendiente' }, { status: 409 });
    }

    const { rows } = await pool.query(
      `UPDATE online_orders SET status = 'cancelado', rejection_reason = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [body.reason?.trim() || 'Sin disponibilidad', id]
    );
    return NextResponse.json({ order: rows[0] });
  } catch (err) {
    console.error('[/api/admin/pedidos-online/[id]/rechazar POST]', err);
    return NextResponse.json({ error: 'Error al rechazar el pedido' }, { status: 500 });
  }
}
