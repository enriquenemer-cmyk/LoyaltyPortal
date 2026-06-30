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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, start_date, end_date, active } = body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
    if (start_date !== undefined) { fields.push(`start_date = $${i++}`); values.push(start_date); }
    if (end_date !== undefined) { fields.push(`end_date = $${i++}`); values.push(end_date); }
    if (active !== undefined) { fields.push(`active = $${i++}`); values.push(active); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar.' }, { status: 400 });
    }

    values.push(id);
    const { rows } = await getPool().query(
      `UPDATE seasons SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (!rows[0]) return NextResponse.json({ error: 'Temporada no encontrada.' }, { status: 404 });

    return NextResponse.json({ season: rows[0] });
  } catch (err) {
    console.error('[/api/admin/seasons/[id] PUT]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Never hard-delete: deactivate so progress data is preserved.
    const { rows } = await getPool().query(
      `UPDATE seasons SET active = false WHERE id = $1 RETURNING *`,
      [id]
    );

    if (!rows[0]) return NextResponse.json({ error: 'Temporada no encontrada.' }, { status: 404 });

    return NextResponse.json({ season: rows[0] });
  } catch (err) {
    console.error('[/api/admin/seasons/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
