import { NextRequest, NextResponse } from 'next/server';
import { getAllRestaurants, insertRestaurant } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const restaurants = await getAllRestaurants();
    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.username) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    const body = await request.json();
    const { name, address, phone, accent_color, google_maps_url } = body;
    if (!name || !address) {
      return NextResponse.json({ error: 'Nombre y dirección son obligatorios.' }, { status: 400 });
    }
    const restaurant = await insertRestaurant({ id: randomUUID(), name, address, phone: phone || null, logo_url: null, accent_color: accent_color || '#2563EB', google_maps_url: google_maps_url || null });
    return NextResponse.json({ restaurant }, { status: 201 });
  } catch (error) {
    console.error('Error creating restaurant:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
