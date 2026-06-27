import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
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
    const { title, description, icon, active, sort_order } = body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
    if (icon !== undefined) { fields.push(`icon = $${idx++}`); values.push(icon); }
    if (active !== undefined) { fields.push(`active = $${idx++}`); values.push(active); }
    if (sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(sort_order); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 });
    }

    values.push(id);
    const pool = getPool();
    const result = await pool.query(
      `UPDATE training_modules SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, restaurant_id, title, description, icon, active, sort_order, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Módulo no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ module: result.rows[0] });
  } catch (error) {
    console.error('[PATCH /api/admin/training/modules/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const pool = getPool();
    const result = await pool.query(`DELETE FROM training_modules WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Módulo no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/training/modules/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
