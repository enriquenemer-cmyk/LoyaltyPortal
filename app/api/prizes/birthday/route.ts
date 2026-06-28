import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { insertPrize } from '@/lib/db';
import { randomUUID } from 'crypto';

function getPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, full_name } = body as { email?: string; full_name?: string };

    if (!email || !full_name) {
      return NextResponse.json({ error: 'email y full_name son requeridos' }, { status: 400 });
    }

    const pool = getPool();

    // Look up previous claims for this email
    const { rows: claims } = await pool.query(
      `SELECT id FROM claims WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (claims.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron registros previos para este correo.' },
        { status: 404 }
      );
    }

    // Build date strings
    const today = new Date();
    const startDate = today.toISOString().slice(0, 10); // YYYY-MM-DD
    const endDate30 = new Date(today);
    endDate30.setDate(endDate30.getDate() + 30);
    const endDate = endDate30.toISOString().slice(0, 10);

    const prizeId = randomUUID();

    const prize = await insertPrize({
      id: prizeId,
      name: `Premio de Cumpleaños - ${full_name}`,
      reason: '¡Feliz cumpleaños! De parte de todo el equipo de Burrito Bar',
      description: 'Un postre de temporada completamente gratis para celebrar tu día especial.',
      start_date: startDate,
      end_date: endDate,
      location: '',
      restaurant_id: null,
      cancelled: false,
      max_uses: 1,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://supertierra.vercel.app';
    const prizeUrl = `${baseUrl}/premio/${prize.id}`;

    // Send push notification (non-blocking)
    fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { 'x-internal-secret': process.env.CRON_SECRET } : {}),
      },
      body: JSON.stringify({
        title: `¡Feliz cumpleaños, ${full_name.split(' ')[0]}! 🎂`,
        body: 'Tienes un premio especial de cumpleaños esperándote.',
        url: prizeUrl,
      }),
    }).catch(() => {});

    return NextResponse.json({ prize, prizeUrl });
  } catch (err) {
    console.error('[birthday] error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
