import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// GET /api/admin/inventory/conteos — historial de conteos físicos, con
// resumen de cuántos artículos tienen diferencia frente al sistema.
export async function GET() {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT c.id, c.status, c.notes, c.started_by, c.closed_by, c.started_at, c.closed_at,
              COUNT(ci.id)::int AS total_items,
              COUNT(ci.id) FILTER (WHERE ci.counted_stock IS NOT NULL)::int AS counted_items,
              COUNT(ci.id) FILTER (WHERE ci.counted_stock IS NOT NULL AND ci.counted_stock <> ci.expected_stock)::int AS diff_items
       FROM inventory_counts c
       LEFT JOIN inventory_count_items ci ON ci.count_id = c.id
       WHERE c.restaurant_id IS NOT DISTINCT FROM $1
       GROUP BY c.id
       ORDER BY c.started_at DESC
       LIMIT 50`,
      [restaurantId]
    );
    return NextResponse.json({ counts: rows });
  } catch (err) {
    console.error('[/api/admin/inventory/conteos GET]', err);
    return NextResponse.json({ error: 'Error al obtener los conteos' }, { status: 500 });
  }
}

// POST /api/admin/inventory/conteos — inicia un nuevo conteo: toma una foto
// del stock actual de todos los productos activos para comparar contra el
// conteo físico real. Solo puede haber un conteo abierto a la vez.
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows: openRows } = await client.query(
        `SELECT id FROM inventory_counts WHERE restaurant_id IS NOT DISTINCT FROM $1 AND status = 'abierto' FOR UPDATE`,
        [restaurantId]
      );
      if (openRows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Ya hay un conteo abierto. Ciérralo antes de iniciar otro.', count_id: openRows[0].id }, { status: 409 });
      }

      const countId = randomUUID();
      await client.query(
        `INSERT INTO inventory_counts (id, restaurant_id, status, started_by) VALUES ($1,$2,'abierto',$3)`,
        [countId, restaurantId, session.username]
      );

      const { rows: products } = await client.query(
        `SELECT id, name, unit, current_stock FROM inventory_products WHERE active = TRUE AND restaurant_id IS NOT DISTINCT FROM $1`,
        [restaurantId]
      );
      for (const p of products) {
        await client.query(
          `INSERT INTO inventory_count_items (id, count_id, product_id, product_name, unit, expected_stock)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [randomUUID(), countId, p.id, p.name, p.unit, p.current_stock]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ count_id: countId, items: products.length }, { status: 201 });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/inventory/conteos POST]', err);
    return NextResponse.json({ error: 'Error al iniciar el conteo' }, { status: 500 });
  }
}
