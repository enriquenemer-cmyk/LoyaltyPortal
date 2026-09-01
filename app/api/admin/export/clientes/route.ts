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

  const restaurantId = session.restaurantId ?? (new URL(req.url)).searchParams.get('restaurant_id') ?? null;
  const pool = getPool();

  const params: unknown[] = [];
  let rClause = '';
  if (restaurantId) { params.push(restaurantId); rClause = `WHERE p.restaurant_id = $1`; }

  const { rows } = await pool.query(
    `SELECT
       cl.phone AS "Teléfono",
       cl.full_name AS "Nombre",
       cl.email AS "Correo",
       COUNT(cl.id)::int AS "Total canjes",
       MAX(cl.claimed_at) AS "Última visita",
       MIN(cl.claimed_at) AS "Primera visita",
       COUNT(cl.id) FILTER (WHERE cl.status='pending')::int AS "Pendientes de entrega",
       COUNT(cl.id) FILTER (WHERE cl.status='delivered')::int AS "Entregados",
       COALESCE(cp.total_points, 0) AS "Puntos acumulados",
       COALESCE(cp.tier, 'bronze') AS "Nivel (bronce/plata/oro)",
       STRING_AGG(DISTINCT p.name, ' | ') AS "Premios canjeados"
     FROM claims cl
     JOIN prizes p ON p.id = cl.prize_id
     LEFT JOIN customer_points cp ON cp.phone = cl.phone AND cp.restaurant_id = p.restaurant_id
     ${rClause}
     GROUP BY cl.phone, cl.full_name, cl.email, cp.total_points, cp.tier
     ORDER BY MAX(cl.claimed_at) DESC
     LIMIT 50000`,
    params
  );

  const headers = Object.keys(rows[0] ?? {});
  if (!headers.length) return new NextResponse('Sin clientes', { status: 404 });

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escapeCSV(r[h])).join(','))
  ].join('\n');

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clientes-${today}.csv"`,
    },
  });
}
