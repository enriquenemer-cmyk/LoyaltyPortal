import { NextRequest, NextResponse } from 'next/server';
import { getTicketClaimByConsolationCode } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim();
  if (!code) {
    return NextResponse.json({ error: 'code requerido' }, { status: 400 });
  }

  const claim = await getTicketClaimByConsolationCode(code);

  if (!claim) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  const now = new Date();

  if (claim.redeemed_at) {
    return NextResponse.json({
      status: 'already_redeemed',
      redeemed_at: claim.redeemed_at,
      redeemed_by: claim.redeemed_by,
    });
  }

  if (claim.expires_at && new Date(claim.expires_at) < now) {
    return NextResponse.json({
      status: 'expired',
      expires_at: claim.expires_at,
    });
  }

  return NextResponse.json({
    status: 'valid',
    claim: {
      id: claim.id,
      consolation_code: claim.consolation_code,
      full_name: claim.full_name,
      phone: claim.phone,
      prize_name: claim.prize_name,
      prize_description: claim.prize_description,
      amount: claim.amount,
      claimed_at: claim.claimed_at,
      expires_at: claim.expires_at,
      restaurant_name: claim.restaurant_name,
    },
  });
}
