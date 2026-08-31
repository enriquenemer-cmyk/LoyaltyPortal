import { NextRequest, NextResponse } from 'next/server';
import { getGamePlayByFolio } from '@/lib/db';

export async function GET(req: NextRequest) {
  const folio = req.nextUrl.searchParams.get('folio')?.toUpperCase().trim();
  if (!folio) {
    return NextResponse.json({ error: 'folio requerido' }, { status: 400 });
  }

  const play = await getGamePlayByFolio(folio);

  if (!play) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  if (play.redeemed_at) {
    return NextResponse.json({
      status: 'already_redeemed',
      redeemed_at: play.redeemed_at,
      redeemed_by: play.redeemed_by,
    });
  }

  return NextResponse.json({
    status: 'valid',
    play: {
      id: play.id,
      folio: play.folio,
      full_name: play.full_name,
      phone: play.phone,
      prize_name: play.prize_name,
      bundle_name: play.bundle_name,
      played_at: play.played_at,
    },
  });
}
