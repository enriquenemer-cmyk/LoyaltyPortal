import { NextRequest, NextResponse } from 'next/server';
import { getExpiringPrizes } from '@/lib/db';

// GET /api/prizes/expiring?days=3
// Returns prizes expiring within `days` days that are not cancelled and have no claims yet.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const days = Math.max(1, parseInt(searchParams.get('days') ?? '3', 10));

  try {
    const prizes = await getExpiringPrizes(days);
    return NextResponse.json({ prizes });
  } catch (err) {
    console.error('[/api/prizes/expiring]', err);
    return NextResponse.json({ prizes: [], error: 'DB error' }, { status: 500 });
  }
}
