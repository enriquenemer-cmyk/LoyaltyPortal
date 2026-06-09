import { NextRequest, NextResponse } from 'next/server';
import { getAllCampaigns, insertCampaign } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id') ?? undefined;
    const campaigns = await getAllCampaigns(restaurantId);
    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, restaurant_id, qr_dot_color, qr_background, qr_dot_style, qr_corner_style, qr_gradient_end } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nombre requerido.' }, { status: 400 });
    }
    const campaign = await insertCampaign({
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() || null,
      restaurant_id: restaurant_id || null,
      qr_dot_color: qr_dot_color || '#0f172a',
      qr_background: qr_background || '#ffffff',
      qr_dot_style: qr_dot_style || 'square',
      qr_corner_style: qr_corner_style || 'square',
      qr_gradient_end: qr_gradient_end || null,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    console.error('Error creating campaign:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
