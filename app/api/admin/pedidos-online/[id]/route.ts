import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

const NEXT_STATUSES = ['preparando', 'listo', 'entregado'];

// PATCH — avanza el estado de un pedido YA confirmado (preparando → listo → entregado).
// Para confirmar o rechazar un pedido pendiente usa /confirmar o /rechazar.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }
  if (!NEXT_STATUSES.includes(body.status ?? '')) {
    return NextResponse.json({ error: `status debe ser uno de: ${NEXT_STATUSES.join(', ')}` }, { status: 400 });
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
    if (order.status === 'pendiente' || order.status === 'cancelado') {
      return NextResponse.json({ error: 'Primero confirma el pedido antes de avanzar su estado' }, { status: 409 });
    }

    const { rows } = await pool.query(
      `UPDATE online_orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [body.status, id]
    );
    return NextResponse.json({ order: rows[0] });
  } catch (err) {
    console.error('[/api/admin/pedidos-online/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error al actualizar el pedido' }, { status: 500 });
  }
}
