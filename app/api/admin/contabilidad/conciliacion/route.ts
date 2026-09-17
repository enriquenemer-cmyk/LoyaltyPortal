import { NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';
import { sugerirCruces, mejorCandidato, explicarResultado, type LineaFactura, type LineaMovimiento } from '@/lib/matching';

export const runtime = 'nodejs';

// GET /api/admin/contabilidad/conciliacion — concilia automáticamente las
// compras a proveedores pendientes contra los movimientos bancarios
// importados, por nombre de proveedor + importe. Devuelve sugerencias listas
// para confirmar, y para las que no cruzan, el candidato más parecido con
// una explicación en español de por qué no calificó.
export async function GET() {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;

    const pool = getPool();

    const { rows: movimientosPendientes } = await pool.query(
      `SELECT bm.id, bm.date, bm.amount, bm.description
       FROM bank_movements bm
       WHERE bm.restaurant_id IS NOT DISTINCT FROM $1 AND bm.matched_purchase_id IS NULL
         AND NOT EXISTS (SELECT 1 FROM cash_cuts cc WHERE cc.bank_movement_id = bm.id)
       ORDER BY bm.date DESC`,
      [restaurantId]
    );

    const { rows: cashCutsPendientes } = await pool.query(
      `SELECT id, date, system_cash, counted_cash, difference, closed_by, closed_at
       FROM cash_cuts
       WHERE COALESCE(restaurant_id,'') = COALESCE($1,'') AND bank_movement_id IS NULL
       ORDER BY date DESC`,
      [restaurantId]
    );

    const { rows: comprasPendientes } = await pool.query(
      `SELECT sp.id, sp.supplier_name, sp.invoice_number, sp.notes, sp.total, sp.date
       FROM supplier_purchases sp
       WHERE sp.restaurant_id IS NOT DISTINCT FROM $1 AND sp.bank_movement_id IS NULL
       ORDER BY sp.date DESC`,
      [restaurantId]
    );

    const { rows: conciliados } = await pool.query(
      `SELECT sp.id AS compra_id, sp.supplier_name, sp.invoice_number, sp.total, sp.date AS compra_fecha,
              bm.id AS movimiento_id, bm.date AS movimiento_fecha, bm.amount, bm.description
       FROM supplier_purchases sp
       JOIN bank_movements bm ON bm.id = sp.bank_movement_id
       WHERE sp.restaurant_id IS NOT DISTINCT FROM $1
       ORDER BY bm.date DESC`,
      [restaurantId]
    );

    const lineasFactura: LineaFactura[] = comprasPendientes.map((c) => ({
      id: c.id,
      proveedor: c.supplier_name,
      concepto: [c.invoice_number, c.notes].filter(Boolean).join(' '),
      importe: c.total !== null ? Number(c.total) : null,
    }));
    const lineasMovimiento: LineaMovimiento[] = movimientosPendientes.map((m) => ({
      id: m.id,
      texto_completo: m.description,
      importe: m.amount !== null ? Number(m.amount) : null,
    }));

    const sugerenciasRaw = sugerirCruces(lineasFactura, lineasMovimiento);
    const compraById = new Map(comprasPendientes.map((c) => [c.id, c]));
    const movimientoById = new Map(movimientosPendientes.map((m) => [m.id, m]));

    const sugerencias = sugerenciasRaw.map((s) => {
      const compra = compraById.get(s.linea_factura_id);
      const movimiento = movimientoById.get(s.linea_movimiento_id);
      const lf = lineasFactura.find((l) => l.id === s.linea_factura_id)!;
      const lm: LineaMovimiento = { id: movimiento.id, texto_completo: movimiento.description, importe: Number(movimiento.amount) };
      return {
        compra_id: s.linea_factura_id,
        movimiento_id: s.linea_movimiento_id,
        compra,
        movimiento,
        resultado: s,
        explicacion: explicarResultado(lf, lm, s),
      };
    });

    const sugeridasCompraIds = new Set(sugerencias.map((s) => s.compra_id));
    const sinSugerencia = comprasPendientes
      .filter((c) => !sugeridasCompraIds.has(c.id))
      .map((c) => {
        const lf = lineasFactura.find((l) => l.id === c.id)!;
        const { movimiento, resultado } = mejorCandidato(lf, lineasMovimiento);
        const movimientoRow = movimiento ? movimientoById.get(movimiento.id) : null;
        return {
          compra: c,
          mejor_candidato: movimientoRow ?? null,
          explicacion: explicarResultado(lf, movimiento, resultado),
        };
      });

    return NextResponse.json({
      movimientos_pendientes: movimientosPendientes,
      sugerencias,
      sin_sugerencia: sinSugerencia,
      conciliados,
      cash_cuts_pendientes: cashCutsPendientes,
    });
  } catch (err) {
    console.error('[/api/admin/contabilidad/conciliacion GET]', err);
    return NextResponse.json({ error: 'Error al calcular la conciliación' }, { status: 500 });
  }
}
