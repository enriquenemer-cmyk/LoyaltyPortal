import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool, insertPrize, insertClaim, logActivity } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { segment, prize_name, prize_description, validity_days } = await req.json() as {
    segment: 'en_riesgo' | 'dormidos';
    prize_name: string;
    prize_description: string;
    validity_days: number;
  };

  const intervalMap = { en_riesgo: '30 days', dormidos: '15 days' };
  const maxIntervalMap = { en_riesgo: '999 days', dormidos: '30 days' };
  const interval = intervalMap[segment];
  const maxInterval = maxIntervalMap[segment];

  const { rows: customers } = await getPool().query<{ phone: string; full_name: string; email: string }>(
    `SELECT phone, MAX(full_name) AS full_name, MAX(email) AS email
     FROM (
       SELECT phone, full_name, email, claimed_at FROM claims
       UNION ALL
       SELECT phone, full_name, phone AS email, claimed_at FROM ticket_claims
     ) a
     GROUP BY phone
     HAVING MAX(claimed_at) < NOW() - INTERVAL '${interval}'
        AND MAX(claimed_at) >= NOW() - INTERVAL '${maxInterval}'`,
    []
  );

  if (customers.length === 0) {
    return NextResponse.json({ generated: 0, message: 'No hay clientes en este segmento.' });
  }

  const endDate = new Date(Date.now() + (validity_days ?? 14) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startDate = new Date().toISOString().split('T')[0];
  let generated = 0;

  for (const customer of customers) {
    const prizeId = randomUUID();
    try {
      await insertPrize({
        id: prizeId,
        name: prize_name ?? 'Premio de reactivación',
        reason: 'Campaña win-back',
        start_date: startDate,
        end_date: endDate,
        description: prize_description ?? '¡Te extrañamos! Vuelve a visitarnos y canjea este premio.',
        location: '',
        restaurant_id: null,
        cancelled: false,
        generated_by: `winback:${segment}`,
        max_uses: 1,
        photo_url: null,
        campaign_id: null,
      });

      await insertClaim({
        id: randomUUID(),
        prize_id: prizeId,
        full_name: customer.full_name ?? customer.phone,
        phone: customer.phone,
        email: customer.email ?? `${customer.phone}@noemail.com`,
        location: null,
        referral_code: null,
        referred_by: null,
      });

      generated++;
    } catch {
      // Continue on individual failure
    }
  }

  logActivity({
    id: randomUUID(),
    restaurant_id: null,
    action: 'winback_campaign_sent',
    description: `Campaña win-back "${prize_name}" enviada a ${generated} clientes (segmento: ${segment})`,
    user_name: session.username,
    metadata: { segment, generated, prize_name },
  }).catch(() => {});

  return NextResponse.json({ generated });
}
