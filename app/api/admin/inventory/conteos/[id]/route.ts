import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// GET /api/admin/inventory/conteos/[id] — detalle de un conteo con todos sus
// artículos (esperado según el sistema vs. lo contado físicamente).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();

    const { rows: [count] } = await pool.query(
      `SELECT * FROM inventory_counts WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2`,
      [id, restaurantId]
    );
    if (!count) return NextResponse.json({ error: 'Conteo no encontrado' }, { status: 404 });

    const { rows: items } = await pool.query(
      `SELECT id, product_id, product_name, unit, expected_stock, counted_stock, counted_at
       FROM inventory_count_items WHERE count_id = $1 ORDER BY product_name`,
      [id]
    );

    return NextResponse.json({ count: { ...count, items } });
  } catch (err) {
    console.error('[/api/admin/inventory/conteos/[id] GET]', err);
    return NextResponse.json({ error: 'Error al obtener el conteo' }, { status: 500 });
  }
}

// PATCH /api/admin/inventory/conteos/[id] — guarda las cantidades contadas
// físicamente (se puede llamar varias veces mientras el conteo esté abierto).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  let body: { items?: { item_id: string; counted_stock: number | null }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: 'No se recibieron artículos' }, { status: 400 });
  }

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();

    const { rows: [count] } = await pool.query(
      `SELECT status FROM inventory_counts WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2`,
      [id, restaurantId]
    );
    if (!count) return NextResponse.json({ error: 'Conteo no encontrado' }, { status: 404 });
    if (count.status !== 'abierto') return NextResponse.json({ error: 'Este conteo ya está cerrado' }, { status: 409 });

    for (const it of items) {
      if (!it.item_id) continue;
      const counted = it.counted_stock === null || it.counted_stock === undefined || (it.counted_stock as unknown) === ''
        ? null
        : Number(it.counted_stock);
      if (counted !== null && (!Number.isFinite(counted) || counted < 0)) {
        return NextResponse.json({ error: `Cantidad inválida para un artículo` }, { status: 400 });
      }
      await pool.query(
        `UPDATE inventory_count_items SET counted_stock = $1::numeric, counted_at = CASE WHEN $1::numeric IS NULL THEN NULL ELSE NOW() END
         WHERE id = $2 AND count_id = $3`,
        [counted, it.item_id, id]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/inventory/conteos/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error al guardar el conteo' }, { status: 500 });
  }
}

// DELETE /api/admin/inventory/conteos/[id] — cancela un conteo abierto sin
// aplicar ningún ajuste (para cuando se inició por error).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();

    const { rows: [count] } = await pool.query(
      `SELECT status FROM inventory_counts WHERE id = $1 AND restaurant_id IS NOT DISTINCT FROM $2`,
      [id, restaurantId]
    );
    if (!count) return NextResponse.json({ error: 'Conteo no encontrado' }, { status: 404 });
    if (count.status !== 'abierto') return NextResponse.json({ error: 'Solo se puede cancelar un conteo abierto' }, { status: 409 });

    await pool.query(`DELETE FROM inventory_counts WHERE id = $1`, [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/inventory/conteos/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error al cancelar el conteo' }, { status: 500 });
  }
}
