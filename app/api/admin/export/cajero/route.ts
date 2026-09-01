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
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const restaurantId = session.restaurantId ?? searchParams.get('restaurant_id') ?? null;

  const pool = getPool();
  const params: unknown[] = [date];
  let rClause = '';
  if (restaurantId) { params.push(restaurantId); rClause = `AND p.restaurant_id = $${params.length}`; }

  const { rows } = await pool.query(
    `SELECT
       cl.id AS "ID Canje",
       cl.full_name AS "Nombre cliente",
       cl.phone AS "Teléfono",
       cl.email AS "Correo",
       p.name AS "Premio",
       p.description AS "Descripción premio",
       p.location AS "Sucursal",
       r.name AS "Negocio",
       cl.claimed_at AS "Hora de escaneo",
       cl.status AS "Estado",
       cl.delivered_at AS "Hora entrega",
       cl.delivered_by AS "Entregado por"
     FROM claims cl
     JOIN prizes p ON p.id = cl.prize_id
     LEFT JOIN restaurants r ON r.id = p.restaurant_id
     WHERE cl.claimed_at::date = $1 ${rClause}
     ORDER BY cl.claimed_at DESC`,
    params
  );

  const headers = Object.keys(rows[0] ?? {});
  if (!headers.length) return new NextResponse('Sin canjes para esta fecha', { status: 404 });

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escapeCSV(r[h])).join(','))
  ].join('\n');

  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="canjes-cajero-${date}.csv"`,
    },
  });
}
