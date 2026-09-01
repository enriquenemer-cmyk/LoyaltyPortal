import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

// GET /api/pos/active-game-bundle — la campaña de juego que se ofrece en el
// recibo del TPV (la más reciente activa). Si no hay ninguna activa, el
// recibo simplemente no muestra el QR de juego.
export async function GET() {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query<{ id: string; name: string }>(
    `SELECT id, name FROM game_bundles WHERE active = TRUE ORDER BY created_at DESC LIMIT 1`
  );

  return NextResponse.json({ bundle: rows[0] ?? null });
}
