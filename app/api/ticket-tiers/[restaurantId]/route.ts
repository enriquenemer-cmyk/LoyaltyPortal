import { NextRequest, NextResponse } from 'next/server';
import { getTicketTiersByRestaurant, upsertTicketTiers } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;
  try {
    const tiers = await getTicketTiersByRestaurant(restaurantId);
    return NextResponse.json({ tiers });
  } catch (err) {
    console.error('ticket-tiers GET error', err);
    return NextResponse.json({ error: 'Error al obtener niveles' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;
  try {
    const body = await req.json();
    const { tiers } = body;
    if (!Array.isArray(tiers)) {
      return NextResponse.json({ error: 'tiers debe ser un arreglo' }, { status: 400 });
    }
    const saved = await upsertTicketTiers(restaurantId, tiers);
    return NextResponse.json({ tiers: saved });
  } catch (err) {
    console.error('ticket-tiers PUT error', err);
    return NextResponse.json({ error: 'Error al guardar niveles' }, { status: 500 });
  }
}
