import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;
  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();
    const { rowCount } = await pool.query(
      `DELETE FROM product_cost_cards WHERE id=$1 AND restaurant_id IS NOT DISTINCT FROM $2`,
      [id, restaurantId]
    );
    if (rowCount === 0) return NextResponse.json({ error: 'Ficha no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/fichas/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar la ficha' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }

  try {
    await ensureAccountingSchema();
  } catch (err) {
    console.error('[/api/admin/fichas/[id] PATCH ensureSchema]', err);
    return NextResponse.json({ error: 'Error al preparar la base de datos' }, { status: 500 });
  }
  const restaurantId = session.restaurantId ?? null;
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let costPerUnit = parseFloat(body.cost_per_unit ?? 0);
    if (body.type === 'prepared' && body.ingredients?.length) {
      costPerUnit = (body.ingredients as { quantity: number; unit_cost: number }[]).reduce(
        (sum, i) => sum + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.unit_cost)) || 0),
        0
      );
    }

    const sellingPrice = body.selling_price ? parseFloat(body.selling_price) : null;
    const marginPct = sellingPrice && costPerUnit > 0
      ? Math.round(((sellingPrice - costPerUnit) / sellingPrice) * 10000) / 100
      : body.margin_pct ?? null;

    const { rows: [card] } = await client.query(
      `UPDATE product_cost_cards SET
         name=$1, category=$2, type=$3, unit=$4, cost_per_unit=$5,
         selling_price=$6, margin_pct=$7, notes=$8, updated_at=NOW()
       WHERE id=$9 AND restaurant_id IS NOT DISTINCT FROM $10 RETURNING *`,
      [body.name, body.category ?? null, body.type ?? 'simple', body.unit ?? 'pza',
       costPerUnit, sellingPrice, marginPct, body.notes ?? null, id, restaurantId]
    );

    if (!card) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Ficha no encontrada' }, { status: 404 });
    }

    if (body.ingredients !== undefined) {
      await client.query(`DELETE FROM recipe_ingredients WHERE product_id=$1`, [id]);
      for (const ing of (body.ingredients ?? [])) {
        await client.query(
          `INSERT INTO recipe_ingredients (product_id, ingredient_name, quantity, unit, unit_cost, inventory_product_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, ing.ingredient_name, ing.quantity, ing.unit ?? 'g', ing.unit_cost, ing.inventory_product_id ?? null]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json(card);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[/api/admin/fichas/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error al actualizar la ficha' }, { status: 500 });
  } finally {
    client.release();
  }
}
