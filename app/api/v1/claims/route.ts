import { NextRequest, NextResponse } from 'next/server';
import { getAllClaims } from '@/lib/db';

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
