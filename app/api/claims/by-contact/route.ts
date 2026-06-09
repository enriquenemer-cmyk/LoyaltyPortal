import { NextRequest, NextResponse } from 'next/server';
import { getClaimsByContact } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contact = searchParams.get('contact')?.trim();

    if (!contact) {
      return NextResponse.json({ error: 'Se requiere el parámetro contact.' }, { status: 400 });
    }

    const claims = await getClaimsByContact(contact);
    return NextResponse.json({ claims });
  } catch (error) {
    console.error('Error fetching claims by contact:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
