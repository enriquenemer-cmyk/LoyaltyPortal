import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;

    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT pc.*,
              json_agg(
                json_build_object(
                  'id', ri.id,
                  'ingredient_name', ri.ingredient_name,
                  'quantity', ri.quantity,
                  'unit', ri.unit,
                  'unit_cost', ri.unit_cost,
                  'total_cost', ri.total_cost,
                  'inventory_product_id', ri.inventory_product_id,
                  'inventory_unit', ip.unit,
                  'inventory_stock', ip.current_stock
                ) ORDER BY ri.id
              ) FILTER (WHERE ri.id IS NOT NULL) AS ingredients
       FROM product_cost_cards pc
       LEFT JOIN recipe_ingredients ri ON ri.product_id = pc.id
       LEFT JOIN inventory_products ip ON ip.id = ri.inventory_product_id
       WHERE pc.restaurant_id IS NOT DISTINCT FROM $1
       GROUP BY pc.id
       ORDER BY pc.category, pc.name`,
      [restaurantId]
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('[/api/admin/fichas GET]', err);
    return NextResponse.json({ error: 'Error al obtener las fichas de costo' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }
  if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
  }

  try {
    await ensureAccountingSchema();
  } catch (err) {
    console.error('[/api/admin/fichas POST ensureSchema]', err);
    return NextResponse.json({ error: 'Error al preparar la base de datos' }, { status: 500 });
  }
  const restaurantId = session.restaurantId ?? null;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // For prepared products, cost = sum of ingredients; for simple, use provided cost
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
      `INSERT INTO product_cost_cards
         (restaurant_id, name, category, type, unit, cost_per_unit, selling_price, margin_pct, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        restaurantId,
        body.name,
        body.category ?? null,
        body.type ?? 'simple',
        body.unit ?? 'pza',
        costPerUnit,
        sellingPrice,
        marginPct,
        body.notes ?? null,
      ]
    );

    if (body.type === 'prepared' && body.ingredients?.length) {
      for (const ing of body.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (product_id, ingredient_name, quantity, unit, unit_cost, inventory_product_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [card.id, ing.ingredient_name, ing.quantity, ing.unit ?? 'g', ing.unit_cost, ing.inventory_product_id ?? null]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json(card);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[/api/admin/fichas POST]', err);
    return NextResponse.json({ error: 'Error al guardar la ficha de costo' }, { status: 500 });
  } finally {
    client.release();
  }
}
