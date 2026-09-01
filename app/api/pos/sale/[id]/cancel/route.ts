import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

// POST /api/pos/sale/[id]/cancel — revierte una venta: regresa el stock a
// inventario y anula el total. Solo el mismo cajero, mismo día — para
// corregir un error justo después de cobrar, no para anular ventas viejas.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const saleResult = await client.query<{ id: string; employee_id: string; cancelled_at: string | null; created_at: string }>(
      `SELECT id, employee_id, cancelled_at, created_at FROM pos_sales WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (saleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }
    const sale = saleResult.rows[0];
    if (sale.employee_id !== session.employeeId) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Solo quien cobró esta venta puede anularla' }, { status: 403 });
    }
    if (sale.cancelled_at) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Esta venta ya fue anulada' }, { status: 409 });
    }
    const saleDate = new Date(sale.created_at).toDateString();
    if (saleDate !== new Date().toDateString()) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Solo se pueden anular ventas del mismo día' }, { status: 409 });
    }

    const itemsResult = await client.query<{ product_id: string; product_name: string; quantity: string }>(
      `SELECT product_id, product_name, quantity FROM pos_sale_items WHERE sale_id = $1`,
      [id]
    );

    for (const item of itemsResult.rows) {
      await client.query(
        `UPDATE inventory_products SET current_stock = ROUND((current_stock + $1)::numeric, 3) WHERE id = $2`,
        [item.quantity, item.product_id]
      );
      await client.query(
        `INSERT INTO inventory_movements (id, product_id, type, quantity, note, created_by)
         VALUES ($1, $2, 'entrada', $3, $4, $5)`,
        [randomUUID(), item.product_id, item.quantity, `Anulación de venta #${id.slice(0, 8).toUpperCase()}`, session.fullName ?? 'Cajero']
      );
    }

    await client.query(`UPDATE pos_sales SET cancelled_at = NOW() WHERE id = $1`, [id]);

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[/api/pos/sale/[id]/cancel POST]', err);
    return NextResponse.json({ error: 'Error al anular la venta' }, { status: 500 });
  } finally {
    client.release();
  }
}
