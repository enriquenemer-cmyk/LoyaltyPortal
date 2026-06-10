import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantTicketConfig, upsertRestaurantTicketConfig } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;
  try {
    const config = await getRestaurantTicketConfig(restaurantId);
    return NextResponse.json({ config });
  } catch (err) {
    console.error('restaurant-ticket-config GET error', err);
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  const { restaurantId } = await params;
  try {
    const body = await req.json();
    const { consolation_prize_name, consolation_prize_description, min_amount_for_game, welcome_title, welcome_subtitle, primary_color } = body;
    if (!consolation_prize_name || !consolation_prize_description) {
      return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 });
    }
    const config = await upsertRestaurantTicketConfig(restaurantId, {
      consolation_prize_name,
      consolation_prize_description,
      min_amount_for_game: parseFloat(min_amount_for_game ?? 0) || 0,
      welcome_title: welcome_title ?? null,
      welcome_subtitle: welcome_subtitle ?? null,
      primary_color: primary_color ?? '#2563EB',
    });
    return NextResponse.json({ config });
  } catch (err) {
    console.error('restaurant-ticket-config PUT error', err);
    return NextResponse.json({ error: 'Error al guardar configuración' }, { status: 500 });
  }
}
