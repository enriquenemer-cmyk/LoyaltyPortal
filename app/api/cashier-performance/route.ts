import { NextRequest, NextResponse } from 'next/server';
import { getCashierPerformance } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const range = (searchParams.get('range') ?? 'week') as 'today' | 'week' | 'month';

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id es requerido.' }, { status: 400 });
    }

    if (!['today', 'week', 'month'].includes(range)) {
      return NextResponse.json({ error: 'range debe ser today, week o month.' }, { status: 400 });
    }

    const performance = await getCashierPerformance(restaurantId, range);
    return NextResponse.json({ performance });
  } catch (error) {
    console.error('Error fetching cashier performance:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
