import { NextRequest, NextResponse } from 'next/server';
import { getAllClaims, logActivity } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { randomUUID } from 'crypto';

function validateApiKey(request: NextRequest): boolean {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('api_key');
  const expected = process.env.PUBLIC_API_KEY;
  if (!expected) return false;
  return key === expected;
}

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: 'API key inválida o ausente.' }, { status: 401 });
  }

  const ip = getClientIp(request);
  if (!await checkRateLimit(`v1_claims_${ip}`, 60, 60 * 1000)) {
    logActivity({
      id: randomUUID(),
      restaurant_id: null,
      action: 'rate_limit_exceeded',
      description: `Rate limit excedido en /api/v1/claims (IP: ${ip})`,
      user_name: 'API',
      metadata: { ip, endpoint: '/api/v1/claims' },
    }).catch(() => {});
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'delivered' | null;
    const claims = await getAllClaims(status ?? undefined);
    return NextResponse.json({ claims, count: claims.length });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
