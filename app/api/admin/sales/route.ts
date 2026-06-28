import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type DailySale = {
  id: string;
  restaurant_id: string | null;
  sale_date: string;
  cash_amount: string;
  card_amount: string;
  other_amount: string;
  total_amount: string;
  ticket_count: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurant_id');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const pool = getPool();

  try {
    const conditions: string[] = [];
    const params: (string)[] = [];

    if (restaurantId) {
      params.push(restaurantId);
      conditions.push(`restaurant_id = $${params.length}`);
    }
    if (from) {
      params.push(from);
      conditions.push(`sale_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      conditions.push(`sale_date <= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query<DailySale & { restaurant_name: string | null }>(
      `SELECT ds.id, ds.restaurant_id, ds.sale_date, ds.cash_amount, ds.card_amount, ds.other_amount,
              ds.total_amount, ds.ticket_count, ds.notes, ds.created_by, ds.created_at,
              r.name AS restaurant_name
       FROM daily_sales ds
       LEFT JOIN restaurants r ON r.id = ds.restaurant_id
       ${whereClause}
       ORDER BY ds.sale_date DESC, ds.created_at DESC`,
      params
    );

    return NextResponse.json({ sales: result.rows });
  } catch (err) {
    console.error('[/api/admin/sales GET]', err);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      restaurant_id,
      sale_date,
      cash_amount,
      card_amount,
      other_amount,
      ticket_count,
      notes,
    } = body ?? {};

    if (!restaurant_id || typeof restaurant_id !== 'string') {
      return NextResponse.json({ error: 'restaurant_id es requerido' }, { status: 400 });
    }
    if (!sale_date || typeof sale_date !== 'string') {
      return NextResponse.json({ error: 'sale_date es requerido' }, { status: 400 });
    }

    const cash = Number(cash_amount) || 0;
    const card = Number(card_amount) || 0;
    const other = Number(other_amount) || 0;
    const tickets = Number(ticket_count) || 0;

    if (cash < 0 || card < 0 || other < 0) {
      return NextResponse.json({ error: 'Los montos no pueden ser negativos' }, { status: 400 });
    }
    if (tickets < 0) {
      return NextResponse.json({ error: 'ticket_count no puede ser negativo' }, { status: 400 });
    }

    const total = cash + card + other;

    const pool = getPool();

    // Manual upsert (no assumed unique constraint on restaurant_id+sale_date):
    // check for an existing row for this restaurant + date, update it if found, else insert.
    const existing = await pool.query<{ id: string }>(
      `SELECT id FROM daily_sales WHERE restaurant_id = $1 AND sale_date = $2 LIMIT 1`,
      [restaurant_id, sale_date]
    );

    if (existing.rows.length > 0) {
      const updated = await pool.query<DailySale>(
        `UPDATE daily_sales SET cash_amount = $1, card_amount = $2, other_amount = $3, total_amount = $4,
           ticket_count = $5, notes = $6, created_by = $7
         WHERE id = $8
         RETURNING id, restaurant_id, sale_date, cash_amount, card_amount, other_amount, total_amount, ticket_count, notes, created_by, created_at`,
        [cash, card, other, total, tickets, notes || null, session.username, existing.rows[0].id]
      );
      return NextResponse.json({ sale: updated.rows[0] }, { status: 200 });
    }

    const inserted = await pool.query<DailySale>(
      `INSERT INTO daily_sales (id, restaurant_id, sale_date, cash_amount, card_amount, other_amount, total_amount, ticket_count, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, restaurant_id, sale_date, cash_amount, card_amount, other_amount, total_amount, ticket_count, notes, created_by, created_at`,
      [randomUUID(), restaurant_id, sale_date, cash, card, other, total, tickets, notes || null, session.username]
    );
    return NextResponse.json({ sale: inserted.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[/api/admin/sales POST]', err);
    return NextResponse.json({ error: 'Error al guardar venta' }, { status: 500 });
  }
}
