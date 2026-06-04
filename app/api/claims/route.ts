import { NextRequest, NextResponse } from 'next/server';
import { insertClaim, getAllClaims, getPrizeById, getPrizeClaimCount, logActivity } from '@/lib/db';
import { sendExpirationReminder } from '@/lib/email';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prize_id, full_name, phone, email, location } = body;

    if (!prize_id || !full_name || !phone || !email) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const prize = await getPrizeById(prize_id);
    if (!prize) {
      return NextResponse.json({ error: 'Premio no encontrado.' }, { status: 404 });
    }

    if (prize.cancelled) {
      return NextResponse.json({ error: 'Este premio fue cancelado.' }, { status: 409 });
    }

    const today = new Date().toISOString().split('T')[0];
    if (today > prize.end_date) {
      return NextResponse.json({ error: 'Este premio ha expirado.' }, { status: 409 });
    }

    const claimCount = await getPrizeClaimCount(prize_id);
    if (claimCount > 0) {
      return NextResponse.json({ error: 'Este QR ya fue utilizado. Solo se puede canjear una vez.' }, { status: 409 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
    }

    const id = randomUUID();
    const claim = await insertClaim({ id, prize_id, full_name, phone, email, location: location || null });

    // Log activity (non-blocking)
    if (prize.restaurant_id) {
      logActivity({
        id: randomUUID(),
        restaurant_id: prize.restaurant_id,
        action: 'claim_registered',
        description: `${full_name} registró el premio: ${prize.name}`,
        user_name: full_name,
        metadata: { claim_id: id, prize_id },
      }).catch(() => {});
    }

    // Send reminder email (non-blocking)
    sendExpirationReminder({
      to: email,
      prizeName: prize.name,
      description: prize.description,
      endDate: prize.end_date,
      location: location || prize.location || '',
      claimId: id,
    }).catch(() => {});

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    console.error('Error creating claim:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'pending' | 'delivered' | null;
    const claims = await getAllClaims(status ?? undefined);
    return NextResponse.json({ claims });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
