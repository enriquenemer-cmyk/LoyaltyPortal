import { NextRequest, NextResponse } from 'next/server';
import { getPool, logActivity } from '@/lib/db';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { randomUUID } from 'crypto';

async function ensureGiftCardsSchema() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gift_cards (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      amount_mxn NUMERIC NOT NULL,
      points INTEGER NOT NULL,
      purchased_by_phone TEXT,
      purchased_by_email TEXT,
      redeemed_by_phone TEXT,
      redeemed_at TIMESTAMPTZ,
      stripe_session_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 12 }, (_, i) =>
    (i > 0 && i % 4 === 0 ? '-' : '') + chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// GET — check a code or list all (admin)
export async function GET(req: NextRequest) {
  await ensureGiftCardsSchema();
  const pool = getPool();

  const code = req.nextUrl.searchParams.get('code');
  if (code) {
    const { rows } = await pool.query(
      'SELECT * FROM gift_cards WHERE code = $1',
      [code.toUpperCase().replace(/\s/g, '')]
    );
    if (!rows[0]) return NextResponse.json({ error: 'Código no encontrado.' }, { status: 404 });
    return NextResponse.json({ gift_card: rows[0] });
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { rows } = await pool.query('SELECT * FROM gift_cards ORDER BY created_at DESC LIMIT 100');
  return NextResponse.json({ gift_cards: rows });
}

// POST — create a gift card (admin) or redeem one (public with phone)
export async function POST(req: NextRequest) {
  await ensureGiftCardsSchema();
  const pool = getPool();
  const body = await req.json() as {
    action: 'create' | 'redeem';
    amount_mxn?: number;
    points?: number;
    purchased_by_phone?: string;
    purchased_by_email?: string;
    code?: string;
    phone?: string;
  };

  if (body.action === 'create') {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

    const amount = body.amount_mxn ?? 200;
    const points = body.points ?? Math.round(amount / 2);
    const code = generateCode();

    const { rows } = await pool.query(
      `INSERT INTO gift_cards (id, code, amount_mxn, points, purchased_by_phone, purchased_by_email)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [randomUUID(), code, amount, points, body.purchased_by_phone ?? null, body.purchased_by_email ?? null]
    );

    logActivity({
      id: randomUUID(),
      restaurant_id: null,
      action: 'gift_card_created',
      description: `Gift card ${code} creada — $${amount} MXN / ${points} puntos`,
      user_name: session.username,
      metadata: { code, amount, points },
    }).catch(() => {});

    return NextResponse.json({ gift_card: rows[0] }, { status: 201 });
  }

  if (body.action === 'redeem') {
    const { code, phone } = body;
    if (!code || !phone) return NextResponse.json({ error: 'code y phone requeridos.' }, { status: 400 });

    const { rows } = await pool.query(
      'SELECT * FROM gift_cards WHERE code = $1',
      [code.toUpperCase().replace(/\s/g, '')]
    );
    const card = rows[0];
    if (!card) return NextResponse.json({ error: 'Código no encontrado.' }, { status: 404 });
    if (card.redeemed_at) return NextResponse.json({ error: 'Este código ya fue canjeado.' }, { status: 409 });

    await pool.query(
      'UPDATE gift_cards SET redeemed_by_phone = $1, redeemed_at = NOW() WHERE id = $2',
      [phone, card.id]
    );

    // Add points to customer
    const { upsertCustomerPoints } = await import('@/lib/db');
    await upsertCustomerPoints(phone, card.purchased_by_email ?? `${phone}@gc.local`, card.points);

    logActivity({
      id: randomUUID(),
      restaurant_id: null,
      action: 'gift_card_redeemed',
      description: `Gift card ${code} canjeada por ${phone} — +${card.points} puntos`,
      user_name: phone,
      metadata: { code, phone, points: card.points },
    }).catch(() => {});

    return NextResponse.json({ ok: true, points_added: card.points });
  }

  return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
}
