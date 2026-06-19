import { NextResponse } from 'next/server';
import { getAnalyticsOverview } from '@/lib/db';

export async function GET() {
  try {
    const data = await getAnalyticsOverview();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[analytics/overview] DB error:', err);
    return NextResponse.json({ error: 'Error al consultar datos' }, { status: 500 });
  }
}
