import { NextRequest, NextResponse } from 'next/server';
import { getActiveEvents, getAllEvents, createEvent, endEvent } from '@/lib/db';

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get('restaurant_id');
  const all = req.nextUrl.searchParams.get('all') === 'true';

  try {
    if (all) {
      const events = await getAllEvents();
      return NextResponse.json({ events });
    }
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id requerido' }, { status: 400 });
    }
    const events = await getActiveEvents(restaurantId);
    return NextResponse.json({ events });
  } catch (err) {
    console.error('GET /api/events error', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      restaurant_id,
      name,
      description,
      event_type,
      multiplier,
      max_participants,
      starts_at,
      ends_at,
      active,
    } = body;

    if (!restaurant_id || !name || !event_type || !starts_at || !ends_at) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const event = await createEvent({
      id: crypto.randomUUID(),
      restaurant_id,
      name,
      description: description ?? null,
      event_type,
      multiplier: multiplier ?? 2,
      max_participants: max_participants ?? null,
      starts_at,
      ends_at,
      active: active ?? true,
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('POST /api/events error', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body;
    if (!id || action !== 'end') {
      return NextResponse.json({ error: 'id y action=end requeridos' }, { status: 400 });
    }
    const event = await endEvent(id);
    if (!event) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    return NextResponse.json({ event });
  } catch (err) {
    console.error('PATCH /api/events error', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
