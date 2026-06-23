import { NextResponse } from 'next/server';
import { getAllPrizes } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    let prizes = await getAllPrizes();
    // Managers only see prizes scoped to their own restaurant; admins see all.
    if (session.role === 'manager' && session.restaurantId) {
      prizes = prizes.filter((p) => p.restaurant_id === session.restaurantId);
    }
    return NextResponse.json({ prizes });
  } catch (err) {
    console.error('Error listing prizes:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
