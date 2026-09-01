import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

const VALID_STATUSES = ['pendiente', 'preparando', 'listo', 'entregado'];

// PATCH /api/pos/comandas/[id] — avanza el estado de una comanda (cocina o
// almacén marcando su propio avance sobre la misma venta).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { status } = await req.json();
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE pos_sales SET status = $1, status_updated_by = $2, status_updated_at = NOW()
       WHERE id = $3 RETURNING id, status`,
      [status, session.fullName ?? 'Cocina/Almacén', id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Comanda no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, comanda: result.rows[0] });
  } catch (err) {
    console.error('[/api/pos/comandas/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error al actualizar la comanda' }, { status: 500 });
  }
}
