import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

let pool: Pool;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { rowCount } = await getPool().query('DELETE FROM users WHERE id = $1', [id]);
    if (!rowCount) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting user:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
