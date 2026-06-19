import { NextRequest, NextResponse } from 'next/server';
import { insertPrize, getAllPrizes, logActivity } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { randomUUID } from 'crypto';

function validateApiKey(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('api_key');
  const expected = process.env.PUBLIC_API_KEY;
  if (!expected) return false;
  return key === expected;
}

async function rateLimitExceeded(request: NextRequest, endpoint: string): Promise<boolean> {
  const ip = getClientIp(request);
  if (await checkRateLimit(`v1_prizes_${ip}`, 60, 60 * 1000)) return false;
  logActivity({
    id: randomUUID(),
    restaurant_id: null,
    action: 'rate_limit_exceeded',
    description: `Rate limit excedido en ${endpoint} (IP: ${ip})`,
    user_name: 'API',
    metadata: { ip, endpoint },
  }).catch(() => {});
  return true;
}

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'API key inválida o ausente.' }, { status: 401 });
  }
  if (await rateLimitExceeded(request, '/api/v1/prizes')) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
  }

  try {
    const prizes = await getAllPrizes();
    return NextResponse.json({ prizes });
  } catch (error) {
    console.error('Error fetching prizes:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'API key inválida o ausente.' }, { status: 401 });
  }
  if (await rateLimitExceeded(request, '/api/v1/prizes')) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, reason, start_date, end_date, description, restaurant_id } = body;

    if (!name || !reason || !start_date || !end_date || !description) {
      return NextResponse.json(
        { error: 'Campos requeridos: name, reason, start_date, end_date, description.' },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const prize = await insertPrize({
      id,
      name,
      reason,
      start_date,
      end_date,
      description,
      location: '',
      restaurant_id: restaurant_id ?? null,
      cancelled: false,
      max_uses: 1,
    });

    if (restaurant_id) {
      await logActivity({
        id: randomUUID(),
        restaurant_id,
        action: 'prize_created',
        description: `Premio creado vía API: ${name}`,
        user_name: 'API',
        metadata: { prize_id: id },
      }).catch(() => {});
    }

    return NextResponse.json({ prize }, { status: 201 });
  } catch (error) {
    console.error('Error creating prize:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
