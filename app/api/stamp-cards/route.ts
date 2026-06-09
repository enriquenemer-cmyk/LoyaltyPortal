import { NextRequest, NextResponse } from 'next/server';
import { getStampCardsByPhone } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'phone requerido' }, { status: 400 });
  }

  try {
    const cards = await getStampCardsByPhone(phone);
    return NextResponse.json({ cards });
  } catch (err) {
    console.error('stamp-cards GET error', err);
    return NextResponse.json({ error: 'Error al obtener tarjetas' }, { status: 500 });
  }
}
