import { NextRequest, NextResponse } from 'next/server';
import { insertClaim, getAllClaims, getPrizeById } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prize_id, full_name, phone, email } = body;

    if (!prize_id || !full_name || !phone || !email) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    const prize = await getPrizeById(prize_id);
    if (!prize) {
      return NextResponse.json({ error: 'Premio no encontrado.' }, { status: 404 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });
    }

    const id = randomUUID();
    const claim = await insertClaim({ id, prize_id, full_name, phone, email });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    console.error('Error creating claim:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const claims = await getAllClaims();
    return NextResponse.json({ claims });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
