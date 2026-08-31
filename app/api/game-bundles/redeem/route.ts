import { NextRequest, NextResponse } from 'next/server';
import { redeemGamePlay } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folio, cashier_name } = body as { folio?: string; cashier_name?: string };
    if (!folio) return NextResponse.json({ error: 'folio requerido' }, { status: 400 });
    if (!cashier_name?.trim()) return NextResponse.json({ error: 'cashier_name requerido' }, { status: 400 });

    const play = await redeemGamePlay(folio, cashier_name.trim());
    if (!play) {
      return NextResponse.json({ error: 'Folio no encontrado o ya fue canjeado' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, play });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al canjear' }, { status: 500 });
  }
}
