import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// PATCH: renombrar o activar/desactivar una mesa.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  let body: { name?: string; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (body.name !== undefined) {
    if (!body.name.trim()) return NextResponse.json({ error: 'El nombre no puede estar vacío' }, { status: 400 });
    fields.push(`name = $${idx++}`);
    values.push(body.name.trim());
  }
  if (body.active !== undefined) {
    fields.push(`active = $${idx++}`);
    values.push(body.active);
  }
  if (fields.length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  values.push(id);

  try {
    await ensureSchema();
    const pool = getPool();
    const { rows } = await pool.query(
      `UPDATE restaurant_tables SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, active`,
      values
    );
    if (rows.length === 0) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
    return NextResponse.json({ table: rows[0] });
  } catch (err) {
    console.error('[/api/admin/mesas/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error al actualizar la mesa' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  try {
    await ensureSchema();
    const pool = getPool();
    const { rowCount } = await pool.query(`UPDATE restaurant_tables SET active = FALSE WHERE id = $1`, [id]);
    if (rowCount === 0) return NextResponse.json({ error: 'Mesa no encontrada' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/mesas/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar la mesa' }, { status: 500 });
  }
}
