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
    `SELECT id, restaurant_id, full_name, position, photo_url, active, total_training_points,
            hourly_rate, scheduled_hours_per_day, scheduled_start_time, created_at
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
    const { full_name, pin, position, restaurant_id, hourly_rate, scheduled_hours_per_day, scheduled_start_time } = await request.json();

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
      `INSERT INTO employees (id, restaurant_id, full_name, pin_hash, position, active, hourly_rate, scheduled_hours_per_day, scheduled_start_time)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8)
       RETURNING id, restaurant_id, full_name, position, photo_url, active, total_training_points, hourly_rate, scheduled_hours_per_day, scheduled_start_time, created_at`,
      [
        id, restaurant_id || null, full_name.trim(), pinHash, position || null,
        typeof hourly_rate === 'number' ? hourly_rate : null,
        typeof scheduled_hours_per_day === 'number' ? scheduled_hours_per_day : null,
        typeof scheduled_start_time === 'string' && scheduled_start_time ? scheduled_start_time : null,
      ]
    );

    return NextResponse.json({ ok: true, employee: rows[0] });
  } catch (err) {
    console.error('Create employee error:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
