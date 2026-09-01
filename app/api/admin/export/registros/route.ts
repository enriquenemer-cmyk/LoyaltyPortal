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
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const restaurantId = session.restaurantId ?? searchParams.get('restaurant_id') ?? null;

  const pool = getPool();
  const params: unknown[] = [];
  const conditions: string[] = [];

  if (restaurantId) {
    params.push(restaurantId);
    conditions.push(`p.restaurant_id = $${params.length}`);
  }
  if (from) { params.push(from); conditions.push(`cl.claimed_at::date >= $${params.length}`); }
  if (to)   { params.push(to);   conditions.push(`cl.claimed_at::date <= $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT
       cl.id AS "ID Registro",
       cl.full_name AS "Nombre completo",
       cl.phone AS "Teléfono",
       cl.email AS "Correo electrónico",
       p.name AS "Premio",
       p.location AS "Sucursal del premio",
       r.name AS "Negocio",
       cl.claimed_at AS "Fecha de registro",
       cl.status AS "Estado",
       cl.delivered_at AS "Fecha entrega",
       cl.delivered_by AS "Entregado por",
       cl.location AS "Ubicación cliente"
     FROM claims cl
     JOIN prizes p ON p.id = cl.prize_id
     LEFT JOIN restaurants r ON r.id = p.restaurant_id
     ${where}
     ORDER BY cl.claimed_at DESC
     LIMIT 50000`,
    params
  );

  const headers = Object.keys(rows[0] ?? {});
  if (!headers.length) return new NextResponse('Sin registros', { status: 404 });

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escapeCSV(r[h])).join(','))
  ].join('\n');

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registros-clientes-${today}.csv"`,
    },
  });
}
