import { NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';

export const runtime = 'nodejs';

// GET /api/pedidos/productos — catálogo público para el menú de pedidos en
// línea (sin sesión: lo ve el cliente desde su celular). Misma fuente que el
// POS: productos simples con precio de venta + platillos de receta con stock
// calculado a partir de los ingredientes reales vinculados.
export async function GET() {
  try {
    await ensureAccountingSchema();
    const pool = getPool();

    const { rows: simple } = await pool.query(
      `SELECT id, name, unit, current_stock, sale_price
       FROM inventory_products
       WHERE active = TRUE AND sale_price IS NOT NULL
       ORDER BY name ASC`
    );

    const { rows: recipes } = await pool.query(
      `SELECT pc.id, pc.name, pc.unit, pc.selling_price AS sale_price,
              COALESCE(MIN(FLOOR(ip.current_stock / NULLIF(ri.quantity, 0))), 999999) AS current_stock
       FROM product_cost_cards pc
       LEFT JOIN recipe_ingredients ri ON ri.product_id = pc.id AND ri.inventory_product_id IS NOT NULL
       LEFT JOIN inventory_products ip ON ip.id = ri.inventory_product_id
       WHERE pc.type = 'prepared' AND pc.selling_price IS NOT NULL
       GROUP BY pc.id
       ORDER BY pc.name ASC`
    );

    const products = [
      ...simple.map((p) => ({ ...p, product_type: 'inventory' as const })),
      ...recipes.map((p) => ({ ...p, product_type: 'recipe' as const })),
    ].filter((p) => Number(p.current_stock) > 0);

    return NextResponse.json({ products });
  } catch (err) {
    console.error('[/api/pedidos/productos GET]', err);
    return NextResponse.json({ error: 'Error al cargar el menú' }, { status: 500 });
  }
}
