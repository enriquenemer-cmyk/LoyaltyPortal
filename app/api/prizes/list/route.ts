import { NextResponse } from 'next/server';
import { getAllPrizes } from '@/lib/db';

export async function GET() {
  try {
    const prizes = await getAllPrizes();
    return NextResponse.json({ prizes });
  } catch (err) {
    console.error('Error listing prizes:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
