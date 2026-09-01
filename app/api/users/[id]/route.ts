import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { logActivity } from '@/lib/db';
import { getSession } from '@/lib/session';

let pool: Pool;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }
    const { id } = await params;
    const body = await request.json();
    const { allowed_sections, role } = body;

    await getPool().query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_sections TEXT[] DEFAULT NULL`);

    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (Array.isArray(allowed_sections)) {
      updates.push(`allowed_sections = $${idx++}`);
      values.push(allowed_sections.length > 0 ? allowed_sections : null);
    }
    if (role) {
      updates.push(`role = $${idx++}`);
      values.push(role);
    }

    if (updates.length === 0) return NextResponse.json({ error: 'Nada que actualizar.' }, { status: 400 });

    values.push(id);
    await getPool().query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating user:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }
    const { id } = await params;
    const { rows } = await getPool().query<{ username: string; restaurant_id: string | null }>(
      'SELECT username, restaurant_id FROM users WHERE id = $1', [id]
    );
    const deletedUser = rows[0];
    const { rowCount } = await getPool().query('DELETE FROM users WHERE id = $1', [id]);
    if (!rowCount) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    if (deletedUser) {
      await logActivity({
        id: randomUUID(),
        restaurant_id: deletedUser.restaurant_id ?? null,
        action: 'user_deleted',
        description: `Usuario eliminado: ${deletedUser.username}`,
        user_name: session.username ?? 'Sistema',
        metadata: { user_id: id },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
