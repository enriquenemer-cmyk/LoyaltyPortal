import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const days = parseInt(body.days ?? '30', 10) || 30;

    const { rows } = await getPool().query<{
      phone: string;
      email: string;
      full_name: string;
      last_claim_date: string;
    }>(`
      SELECT DISTINCT ON (phone)
        phone,
        email,
        full_name,
        MAX(claimed_at) OVER (PARTITION BY phone) AS last_claim_date
      FROM claims
      WHERE phone NOT IN (
        SELECT DISTINCT phone
        FROM claims
        WHERE claimed_at >= NOW() - INTERVAL '1 day' * $1
      )
      ORDER BY phone, claimed_at DESC
    `, [days]);

    const now = Date.now();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://premiatierra.com';

    const customers = rows.map((row) => {
      const lastDate = new Date(row.last_claim_date);
      const daysInactive = Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      // Generate a prize URL placeholder — in production this would generate a real prize
      const prizeUrl = `${appUrl}/premio/regreso`;

      const name = row.full_name.split(' ')[0];
      const message = `¡Hola ${name}! Te extrañamos en Tierra Burrito Bar 🌯 Aquí tienes un premio especial de regreso: ${prizeUrl}`;
      const waUrl = `https://wa.me/${row.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

      return {
        phone: row.phone,
        email: row.email,
        full_name: row.full_name,
        last_claim_date: row.last_claim_date,
        days_inactive: daysInactive,
        wa_url: waUrl,
      };
    });

    // Sort by most inactive first
    customers.sort((a, b) => b.days_inactive - a.days_inactive);

    return NextResponse.json({ customers, total: customers.length, days_threshold: days });
  } catch (error) {
    console.error('Error fetching inactive customers:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
