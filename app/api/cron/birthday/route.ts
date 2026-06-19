import { NextRequest, NextResponse } from 'next/server';
import { getPool, insertPrize, insertClaim, logActivity } from '@/lib/db';
import { randomUUID } from 'crypto';

// Called daily via cron (e.g. Vercel Cron or external scheduler).
// CRON_SECRET env var protects this endpoint.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { rows: birthdays } = await getPool().query<{
    phone: string;
    full_name: string | null;
    email: string;
    tier: string;
  }>(
    `SELECT phone, full_name, email, tier
     FROM customer_points
     WHERE birthday IS NOT NULL
       AND EXTRACT(MONTH FROM birthday) = $1
       AND EXTRACT(DAY FROM birthday) = $2`,
    [month, day]
  );

  if (birthdays.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No hay cumpleaños hoy.' });
  }

  const results: string[] = [];
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startDate = today.toISOString().split('T')[0];

  for (const customer of birthdays) {
    const prizeName =
      customer.tier === 'gold'
        ? 'Premio premium de cumpleaños'
        : customer.tier === 'silver'
        ? 'Regalo especial de cumpleaños'
        : 'Surprise de cumpleaños';

    const prizeId = randomUUID();
    try {
      await insertPrize({
        id: prizeId,
        name: prizeName,
        reason: `Cumpleaños de ${customer.full_name ?? customer.phone}`,
        start_date: startDate,
        end_date: endDate,
        description: `¡Feliz cumpleaños! Tienes 7 días para canjear tu regalo.`,
        location: '',
        restaurant_id: null,
        cancelled: false,
        generated_by: 'cron:birthday',
        max_uses: 1,
        photo_url: null,
        campaign_id: null,
      });

      await insertClaim({
        id: randomUUID(),
        prize_id: prizeId,
        full_name: customer.full_name ?? customer.phone,
        phone: customer.phone,
        email: customer.email,
        location: null,
        referral_code: null,
        referred_by: null,
      });

      logActivity({
        id: randomUUID(),
        restaurant_id: null,
        action: 'birthday_prize_generated',
        description: `Premio de cumpleaños generado para ${customer.full_name ?? customer.phone} (${customer.tier})`,
        user_name: 'Sistema',
        metadata: { phone: customer.phone, tier: customer.tier, prize_id: prizeId },
      }).catch(() => {});

      results.push(customer.phone);
    } catch {
      // Log and continue — don't let one failure block the rest
    }
  }

  return NextResponse.json({ processed: results.length, phones: results });
}
