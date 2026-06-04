import { NextRequest, NextResponse } from 'next/server';
import { insertPrize, getPrizeById } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, reason, start_date, end_date, description, location } = body;

    if (!name || !reason || !start_date || !end_date || !description || !location) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const prize = await insertPrize({ id, name, reason, start_date, end_date, description, location });

    return NextResponse.json({ prize }, { status: 201 });
  } catch (error) {
    console.error('Error creating prize:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido.' }, { status: 400 });
    }

    const prize = await getPrizeById(id);
    if (!prize) {
      return NextResponse.json({ error: 'Premio no encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ prize });
  } catch (error) {
    console.error('Error fetching prize:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
