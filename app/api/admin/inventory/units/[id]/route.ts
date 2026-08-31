import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';
import type { InventoryUnit } from '../route';

export const runtime = 'nodejs';

// GET /api/admin/inventory/units/[id] — resuelve una unidad a partir de su
// QR (usado por el flujo de escaneo antes de confirmar el retiro).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const { rows } = await getPool().query<InventoryUnit & { product_description: string | null }>(
      `SELECT u.id, u.product_id, p.name as product_name, p.unit, p.description as product_description,
              u.order_number, u.weight, u.status, u.location,
              u.received_at, u.retired_at, u.retired_by
       FROM inventory_units u
       JOIN inventory_products p ON p.id = u.product_id
       WHERE u.id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Unidad no encontrada — ¿el QR es de este sistema?' }, { status: 404 });
    }
    return NextResponse.json({ unit: rows[0] });
  } catch (err) {
    console.error('[/api/admin/inventory/units/[id] GET]', err);
    return NextResponse.json({ error: 'Error al buscar la unidad' }, { status: 500 });
  }
}

// PATCH /api/admin/inventory/units/[id] — asigna o actualiza la ubicación de
// almacenamiento de una unidad (flujo: se recibe, se coloca en su lugar, se
// escanea el QR ya puesto para anotar dónde quedó).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const { location } = body as { location?: string };
    if (typeof location !== 'string') {
      return NextResponse.json({ error: 'location es requerido' }, { status: 400 });
    }
    const trimmed = location.trim() || null;

    await getPool().query(`UPDATE inventory_units SET location = $2 WHERE id = $1`, [id, trimmed]);

    const { rows } = await getPool().query<InventoryUnit & { product_description: string | null }>(
      `SELECT u.id, u.product_id, p.name as product_name, p.unit, p.description as product_description,
              u.order_number, u.weight, u.status, u.location,
              u.received_at, u.retired_at, u.retired_by
       FROM inventory_units u
       JOIN inventory_products p ON p.id = u.product_id
       WHERE u.id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Unidad no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ unit: rows[0] });
  } catch (err) {
    console.error('[/api/admin/inventory/units/[id] PATCH]', err);
    return NextResponse.json({ error: 'Error al actualizar la ubicación' }, { status: 500 });
  }
}
