import { NextRequest, NextResponse } from 'next/server';
import { countTicketClaimsByPhoneToday } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const DAILY_LIMIT = 3;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!await checkRateLimit(`ticket_claims_check_${ip}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  const restaurant_id = searchParams.get('restaurant_id');

  if (!phone || !restaurant_id) {
    return NextResponse.json({ error: 'phone y restaurant_id requeridos' }, { status: 400 });
  }

  try {
    const count = await countTicketClaimsByPhoneToday(phone, restaurant_id);
    return NextResponse.json({
      count,
      limit: DAILY_LIMIT,
      allowed: count < DAILY_LIMIT,
    });
  } catch (err) {
    console.error('ticket-claims/check error', err);
    return NextResponse.json({ error: 'Error al verificar límite' }, { status: 500 });
  }
}
