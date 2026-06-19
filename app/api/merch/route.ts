import { NextRequest, NextResponse } from 'next/server';
import { getPool, logActivity } from '@/lib/db';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { randomUUID } from 'crypto';

async function adminSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function GET(req: NextRequest) {
  const pool = getPool();
  const restaurantId = req.nextUrl.searchParams.get('restaurant_id');

  let q = 'SELECT * FROM merch_items WHERE active = TRUE';
  const params: string[] = [];
  if (restaurantId) { q += ' AND restaurant_id = $1'; params.push(restaurantId); }
  q += ' ORDER BY created_at DESC';

  const { rows } = await pool.query(q, params);
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const pool = getPool();
  const body = await req.json() as {
    action: 'create' | 'redeem' | 'delete';
    id?: string;
    name?: string;
    description?: string;
    photo_url?: string;
    points_cost?: number;
    stock?: number;
    restaurant_id?: string;
    phone?: string;
  };

  if (body.action === 'create') {
    const session = await adminSession();
    if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    if (!body.name || !body.points_cost) return NextResponse.json({ error: 'name y points_cost requeridos.' }, { status: 400 });

    const { rows } = await pool.query(
      `INSERT INTO merch_items (id, name, description, photo_url, points_cost, stock, restaurant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [randomUUID(), body.name, body.description ?? null, body.photo_url ?? null,
       body.points_cost, body.stock ?? null, body.restaurant_id ?? null]
    );
    return NextResponse.json({ item: rows[0] }, { status: 201 });
  }

  if (body.action === 'delete') {
    const session = await adminSession();
    if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    await pool.query('UPDATE merch_items SET active = FALSE WHERE id = $1', [body.id]);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'redeem') {
    const { phone, id: itemId } = body;
    if (!phone || !itemId) return NextResponse.json({ error: 'phone e id requeridos.' }, { status: 400 });

    const { rows: items } = await pool.query('SELECT * FROM merch_items WHERE id = $1 AND active = TRUE', [itemId]);
    const item = items[0];
    if (!item) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
    if (item.stock !== null && item.stock <= 0) return NextResponse.json({ error: 'Sin stock disponible.' }, { status: 409 });

    const { rows: cp } = await pool.query('SELECT total_points FROM customer_points WHERE phone = $1', [phone]);
    if (!cp[0]) return NextResponse.json({ error: 'Cliente no encontrado.' }, { status: 404 });
    if (cp[0].total_points < item.points_cost) {
      return NextResponse.json({ error: `Puntos insuficientes. Necesitas ${item.points_cost} pts.` }, { status: 409 });
    }

    await pool.query('UPDATE customer_points SET total_points = total_points - $1, updated_at = NOW() WHERE phone = $2', [item.points_cost, phone]);
    if (item.stock !== null) await pool.query('UPDATE merch_items SET stock = stock - 1 WHERE id = $1', [itemId]);

    const { rows: red } = await pool.query(
      `INSERT INTO merch_redemptions (id, merch_item_id, phone, points_spent, status)
       VALUES ($1,$2,$3,$4,'pending') RETURNING *`,
      [randomUUID(), itemId, phone, item.points_cost]
    );

    logActivity({
      id: randomUUID(), restaurant_id: null,
      action: 'merch_redeemed',
      description: `${phone} canjeó "${item.name}" por ${item.points_cost} pts`,
      user_name: phone,
      metadata: { item_id: itemId, item_name: item.name, points: item.points_cost },
    }).catch(() => {});

    return NextResponse.json({ ok: true, redemption: red[0] });
  }

  return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
}
