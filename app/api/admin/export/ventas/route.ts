import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

function escapeCSV(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = searchParams.get('to') ?? new Date().toISOString().slice(0, 10);
  const restaurantId = session.restaurantId ?? searchParams.get('restaurant_id') ?? null;

  const pool = getPool();
  const params: string[] = [from, to];
  let restaurantClause = '';
  if (restaurantId) {
    params.push(restaurantId);
    restaurantClause = `AND ds.restaurant_id = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT
       ds.sale_date AS "Fecha",
       r.name AS "Restaurante/Negocio",
       ds.ticket_count AS "Tickets/Comandas",
       ds.cash_amount::numeric AS "Efectivo",
       ds.card_amount::numeric AS "Tarjeta",
       ds.other_amount::numeric AS "Otro",
       ds.total_amount::numeric AS "Total",
       ds.notes AS "Notas",
       ds.created_by AS "Registrado por",
       ds.created_at AS "Fecha registro"
     FROM daily_sales ds
     LEFT JOIN restaurants r ON r.id = ds.restaurant_id
     WHERE ds.sale_date BETWEEN $1 AND $2 ${restaurantClause}
     ORDER BY ds.sale_date DESC`,
    params
  );

  if (rows.length === 0) {
    return new NextResponse('No hay ventas en el rango seleccionado', { status: 404 });
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escapeCSV(r[h])).join(','))
  ].join('\n');

  const filename = `ventas-TPV-${from}_${to}.csv`;
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
