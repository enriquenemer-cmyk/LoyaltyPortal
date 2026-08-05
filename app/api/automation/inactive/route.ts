import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

// Accept Vercel Cron's automatic `Authorization: Bearer <CRON_SECRET>` header,
// as well as the manual `x-cron-secret` header / `secret` query param conventions
// used by the other cron routes for local testing.
function isCronAuthorized(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true;
  const bearer = req.headers.get('authorization');
  if (bearer === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

async function runInactiveAutomation(days: number) {
  try {
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://premia-tierra.vercel.app';

    const customers = rows.map((row) => {
      const lastDate = new Date(row.last_claim_date);
      const daysInactive = Math.floor((now - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      // Generate a prize URL placeholder — in production this would generate a real prize
      const prizeUrl = `${appUrl}/premio/regreso`;

      const name = row.full_name.split(' ')[0];
      const message = `¡Hola ${name}! Te extrañamos en 3E 🌯 Aquí tienes un premio especial de regreso: ${prizeUrl}`;
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

    // Send push notifications to inactive customers (non-blocking, per-phone)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://premia-tierra.vercel.app';
    for (const c of customers.slice(0, 50)) {
      const name = c.full_name.split(' ')[0];
      fetch(`${baseUrl}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRON_SECRET ? { 'x-internal-secret': process.env.CRON_SECRET } : {}),
        },
        body: JSON.stringify({
          phone: c.phone,
          title: `¡Te extrañamos, ${name}! 🌯`,
          body: 'Tenemos un premio especial de regreso esperándote en 3E.',
          url: `${appUrl}/premio/regreso`,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ customers, total: customers.length, days_threshold: days });
  } catch (error) {
    console.error('Error fetching inactive customers:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// Called manually from the admin UI.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const days = parseInt(body.days ?? '30', 10) || 30;
  return runInactiveAutomation(days);
}

// Called daily/weekly via cron (e.g. Vercel Cron). CRON_SECRET env var protects this endpoint.
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10) || 30;
  return runInactiveAutomation(days);
}
