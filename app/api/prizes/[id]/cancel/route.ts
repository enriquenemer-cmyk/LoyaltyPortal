import { NextRequest, NextResponse } from 'next/server';
import { cancelPrize, getPrizeById, logActivity } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    const prize = await getPrizeById(id);
    if (!prize) return NextResponse.json({ error: 'Premio no encontrado.' }, { status: 404 });
    if (prize.cancelled) return NextResponse.json({ error: 'Ya está cancelado.' }, { status: 400 });

    // Managers may only cancel prizes belonging to their own restaurant.
    if (session.role === 'manager' && session.restaurantId && prize.restaurant_id !== session.restaurantId) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }

    const updated = await cancelPrize(id);

    // Log activity
    if (prize.restaurant_id) {
      await logActivity({
        id: randomUUID(),
        restaurant_id: prize.restaurant_id,
        action: 'prize_cancelled',
        description: `Premio cancelado: ${prize.name}`,
        user_name: session.username ?? 'Sistema',
        metadata: { prize_id: id },
      }).catch(() => {});
    }

    return NextResponse.json({ prize: updated });
  } catch (err) {
    console.error('Error cancelling prize:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
