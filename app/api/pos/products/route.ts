import { NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

// GET /api/pos/products — artículos vendibles en el punto de venta: productos
// simples de inventario, más platillos elaborados (recetas) cuyo stock
// disponible se calcula a partir de los ingredientes vinculados a inventario real.
export async function GET() {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    // Las tablas de fichas de costo/recetas viven en el esquema de
    // contabilidad: en un restaurante nuevo que nunca abrió esa sección
    // podrían no existir todavía, y sin esto el POS entero fallaría.
    await ensureAccountingSchema();

    const pool = getPool();
    const conditions = ['p.active = TRUE', 'p.sale_price IS NOT NULL'];
    const values: unknown[] = [];
    if (session.restaurantId) {
      conditions.push(`(p.restaurant_id = $1 OR p.restaurant_id IS NULL)`);
      values.push(session.restaurantId);
    }

    const { rows: simple } = await pool.query(
      `SELECT p.id, p.name, p.unit, p.current_stock, p.sale_price
       FROM inventory_products p
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.name ASC`,
      values
    );

    const recipeConditions = [`pc.type = 'prepared'`, 'pc.selling_price IS NOT NULL'];
    const recipeValues: unknown[] = [];
    if (session.restaurantId) {
      recipeConditions.push(`(pc.restaurant_id = $1 OR pc.restaurant_id IS NULL)`);
      recipeValues.push(session.restaurantId);
    }

    const { rows: recipes } = await pool.query(
      `SELECT pc.id, pc.name, pc.unit, pc.selling_price AS sale_price,
              COALESCE(MIN(FLOOR(ip.current_stock / NULLIF(ri.quantity, 0))), 999999) AS current_stock
       FROM product_cost_cards pc
       LEFT JOIN recipe_ingredients ri ON ri.product_id = pc.id AND ri.inventory_product_id IS NOT NULL
       LEFT JOIN inventory_products ip ON ip.id = ri.inventory_product_id
       WHERE ${recipeConditions.join(' AND ')}
       GROUP BY pc.id
       ORDER BY pc.name ASC`,
      recipeValues
    );

    const products = [
      ...simple.map(p => ({ ...p, product_type: 'inventory' as const })),
      ...recipes.map(p => ({ ...p, product_type: 'recipe' as const })),
    ];

    return NextResponse.json({ products });
  } catch (err) {
    console.error('[/api/pos/products GET]', err);
    return NextResponse.json({ error: 'Error al cargar los artículos' }, { status: 500 });
  }
}
