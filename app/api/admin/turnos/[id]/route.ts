import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = await params;

  try {
    await ensureSchema();
    const pool = getPool();
    const { rowCount } = await pool.query(`DELETE FROM shift_schedules WHERE id = $1`, [id]);
    if (rowCount === 0) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/admin/turnos/[id] DELETE]', err);
    return NextResponse.json({ error: 'Error al eliminar el turno' }, { status: 500 });
  }
}
