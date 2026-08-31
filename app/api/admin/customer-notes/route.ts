import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

type CustomerNote = {
  id: string;
  phone: string;
  note: string;
  created_by: string | null;
  created_at: string;
};

// GET /api/admin/customer-notes?phone=X — notas/preferencias acumuladas de
// un cliente, más reciente primero.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });

  try {
    const { rows } = await getPool().query<CustomerNote>(
      `SELECT id, phone, note, created_by, created_at FROM customer_notes WHERE phone = $1 ORDER BY created_at DESC`,
      [phone]
    );
    return NextResponse.json({ notes: rows });
  } catch (err) {
    console.error('[/api/admin/customer-notes GET]', err);
    return NextResponse.json({ error: 'Error al obtener las notas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { phone, note } = body ?? {};
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'phone es requerido' }, { status: 400 });
    }
    if (!note || typeof note !== 'string' || !note.trim()) {
      return NextResponse.json({ error: 'La nota no puede estar vacía' }, { status: 400 });
    }

    const id = randomUUID();
    const { rows } = await getPool().query<CustomerNote>(
      `INSERT INTO customer_notes (id, phone, note, created_by) VALUES ($1, $2, $3, $4)
       RETURNING id, phone, note, created_by, created_at`,
      [id, phone, note.trim(), session.username]
    );
    return NextResponse.json({ note: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('[/api/admin/customer-notes POST]', err);
    return NextResponse.json({ error: 'Error al guardar la nota' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

  await getPool().query(`DELETE FROM customer_notes WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
