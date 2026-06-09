import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantById, getRestaurantStats, getClaimsByRestaurant, updateRestaurant, getRestaurantActivity } from '@/lib/db';
import { put } from '@vercel/blob';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurant = await getRestaurantById(id);
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante no encontrado.' }, { status: 404 });
    }
    const [stats, claims, activity] = await Promise.all([
      getRestaurantStats(id),
      getClaimsByRestaurant(id),
      getRestaurantActivity(id, 20),
    ]);
    return NextResponse.json({ restaurant, stats, claims, activity });
  } catch (error) {
    console.error('Error fetching restaurant:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const restaurant = await getRestaurantById(id);
    if (!restaurant) return NextResponse.json({ error: 'Restaurante no encontrado.' }, { status: 404 });

    const contentType = request.headers.get('content-type') || '';
    let name: string | undefined;
    let address: string | undefined;
    let phone: string | null | undefined;
    let logo_url: string | null | undefined;
    let google_maps_url: string | null | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      name = (formData.get('name') as string) || undefined;
      address = (formData.get('address') as string) || undefined;
      const phoneVal = formData.get('phone') as string;
      phone = phoneVal || null;
      const googleMapsVal = formData.get('google_maps_url') as string;
      google_maps_url = googleMapsVal || null;
      const file = formData.get('logo') as File | null;
      if (file && file.size > 0) {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN no configurado.' }, { status: 500 });
        }
        const blob = await put(`logos/${id}-${Date.now()}.${file.name.split('.').pop()}`, file, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        logo_url = blob.url;
      }
    } else {
      const body = await request.json();
      name = body.name;
      address = body.address;
      phone = body.phone;
      logo_url = body.logo_url;
      google_maps_url = body.google_maps_url;
    }

    const updated = await updateRestaurant(id, { name, address, phone, logo_url, google_maps_url });
    return NextResponse.json({ restaurant: updated });
  } catch (error) {
    console.error('Error updating restaurant:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
