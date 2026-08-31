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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { full_name, pin, position, restaurant_id, active, hourly_rate, scheduled_hours_per_day, scheduled_start_time } = body ?? {};

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (typeof full_name === 'string' && full_name.trim()) {
      fields.push(`full_name = $${idx++}`);
      values.push(full_name.trim());
    }
    if (typeof position === 'string' || position === null) {
      fields.push(`position = $${idx++}`);
      values.push(position || null);
    }
    if (typeof restaurant_id === 'string' || restaurant_id === null) {
      fields.push(`restaurant_id = $${idx++}`);
      values.push(restaurant_id || null);
    }
    if (typeof active === 'boolean') {
      fields.push(`active = $${idx++}`);
      values.push(active);
    }
    if (typeof hourly_rate === 'number' || hourly_rate === null) {
      fields.push(`hourly_rate = $${idx++}`);
      values.push(hourly_rate);
    }
    if (typeof scheduled_hours_per_day === 'number' || scheduled_hours_per_day === null) {
      fields.push(`scheduled_hours_per_day = $${idx++}`);
      values.push(scheduled_hours_per_day);
    }
    if (typeof scheduled_start_time === 'string' || scheduled_start_time === null) {
      fields.push(`scheduled_start_time = $${idx++}`);
      values.push(scheduled_start_time || null);
    }
    if (typeof pin === 'string') {
      if (!/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ error: 'El PIN debe tener entre 4 y 6 dígitos.' }, { status: 400 });
      }
      const pinHash = await bcrypt.hash(pin, 10);
      fields.push(`pin_hash = $${idx++}`);
      values.push(pinHash);
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar.' }, { status: 400 });
    }

    values.push(id);
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, restaurant_id, full_name, position, photo_url, active, total_training_points, hourly_rate, scheduled_hours_per_day, scheduled_start_time, created_at`,
      values
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Empleado no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, employee: rows[0] });
  } catch (err) {
    console.error('Update employee error:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const pool = getPool();

  const { rows } = await pool.query(
    `UPDATE employees SET active = FALSE WHERE id = $1 RETURNING id`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Empleado no encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
