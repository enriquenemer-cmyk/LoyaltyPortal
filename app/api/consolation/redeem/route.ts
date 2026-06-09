import { NextRequest, NextResponse } from 'next/server';
import { getTicketClaimByConsolationCode, redeemConsolationCode } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { code, cashier_name } = await req.json();

    if (!code || !cashier_name) {
      return NextResponse.json({ error: 'code y cashier_name requeridos' }, { status: 400 });
    }

    const upperCode = String(code).toUpperCase().trim();

    const claim = await getTicketClaimByConsolationCode(upperCode);
    if (!claim) {
      return NextResponse.json({ error: 'Código no encontrado' }, { status: 404 });
    }

    if (claim.redeemed_at) {
      return NextResponse.json({ error: 'El código ya fue canjeado', status: 'already_redeemed' }, { status: 409 });
    }

    if (claim.expires_at && new Date(claim.expires_at) < new Date()) {
      return NextResponse.json({ error: 'El código ha expirado', status: 'expired' }, { status: 410 });
    }

    const updated = await redeemConsolationCode(upperCode, cashier_name);
    if (!updated) {
      return NextResponse.json({ error: 'No se pudo canjear. Intenta de nuevo.' }, { status: 409 });
    }

    return NextResponse.json({ success: true, redeemed_at: updated.redeemed_at, redeemed_by: updated.redeemed_by });
  } catch (err) {
    console.error('consolation redeem error', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
