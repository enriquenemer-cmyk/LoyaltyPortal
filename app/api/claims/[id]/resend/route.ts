import { NextRequest, NextResponse } from 'next/server';
import { getClaimById } from '@/lib/db';
import { sendClaimLink } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const claim = await getClaimById(id);
    if (!claim) {
      return NextResponse.json({ error: 'Registro no encontrado.' }, { status: 404 });
    }

    const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
    const claim_url = `${origin}/cajero/${id}`;

    await sendClaimLink({
      to: claim.email,
      full_name: claim.full_name,
      prize_name: claim.prize_name,
      claim_url,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error resending claim link:', error);
    return NextResponse.json({ error: 'Error al enviar el correo.' }, { status: 500 });
  }
}
