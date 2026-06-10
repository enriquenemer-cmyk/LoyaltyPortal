import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export type SegmentCustomer = {
  phone: string;
  full_name: string;
  last_visit: string;
  days_since_visit: number;
  total_cobros: number;
};

export type Segment = {
  id: 'en_riesgo' | 'dormidos' | 'activos' | 'vip';
  label: string;
  emoji: string;
  color: string;
  count: number;
  customers: SegmentCustomer[];
};

export async function GET() {
  try {
    const pool = getPool();

    const { rows } = await pool.query<{
      phone: string;
      full_name: string;
      last_visit: string;
      total_cobros: string;
    }>(`
      SELECT
        c.phone,
        MAX(c.full_name) AS full_name,
        MAX(c.claimed_at) AS last_visit,
        COUNT(*)::text AS total_cobros
      FROM claims c
      GROUP BY c.phone
      ORDER BY MAX(c.claimed_at) DESC
    `);

    const now = Date.now();

    const customers: SegmentCustomer[] = rows.map((r) => {
      const lastVisitMs = new Date(r.last_visit).getTime();
      const daysSince = Math.floor((now - lastVisitMs) / (1000 * 60 * 60 * 24));
      return {
        phone: r.phone,
        full_name: r.full_name,
        last_visit: r.last_visit,
        days_since_visit: daysSince,
        total_cobros: parseInt(r.total_cobros, 10),
      };
    });

    const enRiesgo = customers.filter((c) => c.days_since_visit > 30);
    const dormidos = customers.filter((c) => c.days_since_visit >= 15 && c.days_since_visit <= 30);
    const activos = customers.filter((c) => c.days_since_visit < 15);
    const vip = customers.filter((c) => c.total_cobros > 5);

    const segments: Segment[] = [
      {
        id: 'en_riesgo',
        label: 'En riesgo',
        emoji: '🔴',
        color: '#EF4444',
        count: enRiesgo.length,
        customers: enRiesgo,
      },
      {
        id: 'dormidos',
        label: 'Dormidos',
        emoji: '🟡',
        color: '#F59E0B',
        count: dormidos.length,
        customers: dormidos,
      },
      {
        id: 'activos',
        label: 'Activos',
        emoji: '🟢',
        color: '#10B981',
        count: activos.length,
        customers: activos,
      },
      {
        id: 'vip',
        label: 'VIP',
        emoji: '⭐',
        color: '#2563EB',
        count: vip.length,
        customers: vip,
      },
    ];

    return NextResponse.json({ segments });
  } catch (err) {
    console.error('segmentacion GET error', err);
    return NextResponse.json({ error: 'Error al obtener segmentos' }, { status: 500 });
  }
}
