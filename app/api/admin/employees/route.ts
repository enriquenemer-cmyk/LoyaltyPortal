import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import bcrypt from 'bcryptjs';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT id, restaurant_id, full_name, position, photo_url, active, total_training_points, created_at
     FROM employees
     ORDER BY active DESC, full_name ASC`
  );

  return NextResponse.json({ employees: rows });
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { full_name, pin, position, restaurant_id } = await request.json();

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido.' }, { status: 400 });
    }
    if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'El PIN debe tener entre 4 y 6 dígitos.' }, { status: 400 });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const id = crypto.randomUUID();
    const pool = getPool();

    const { rows } = await pool.query(
      `INSERT INTO employees (id, restaurant_id, full_name, pin_hash, position, active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, restaurant_id, full_name, position, photo_url, active, total_training_points, created_at`,
      [id, restaurant_id || null, full_name.trim(), pinHash, position || null]
    );

    return NextResponse.json({ ok: true, employee: rows[0] });
  } catch (err) {
    console.error('Create employee error:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
