import { NextRequest, NextResponse } from 'next/server';
import { insertPrize, getPrizeById, logActivity } from '@/lib/db';
import { randomUUID, createHmac } from 'crypto';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    // Require an authenticated admin/manager session — this route is used by
    // the internal admin UI to mint prize QR codes, not a public endpoint
    // (public/external access goes through /api/v1/prizes with an API key).
    let generatedBy: string | null = null;
    try {
      const cookieStore = await cookies();
      const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
      if (session.username) generatedBy = session.username;
    } catch {
      // session not available
    }
    if (!generatedBy) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, reason, start_date, end_date, description, restaurant_id, max_uses, photo_url, campaign_id, valid_hours, valid_days, activate_at, game_type } = body;

    if (!name || !reason || !start_date || !end_date || !description) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    const id = randomUUID();
    const prize = await insertPrize({
      id, name, reason, start_date, end_date, description,
      location: '', restaurant_id: restaurant_id || null, cancelled: false,
      generated_by: generatedBy,
      max_uses: typeof max_uses === 'number' && max_uses >= 1 ? max_uses : 1,
      photo_url: photo_url || null,
      campaign_id: campaign_id || null,
      valid_hours: valid_hours ?? null,
      valid_days: valid_days ?? null,
      activate_at: activate_at ?? null,
      game_type: game_type ?? null,
    });

    // Generate HMAC signature for QR
    const secret = process.env.SESSION_SECRET ?? 'fallback-secret';
    const sig = createHmac('sha256', secret).update(prize.id).digest('hex').slice(0, 16);

    if (restaurant_id) {
      await logActivity({
        id: randomUUID(),
        restaurant_id,
        action: 'prize_created',
        description: `Premio creado: ${name}`,
        user_name: generatedBy ?? 'Sistema',
        metadata: { prize_id: id },
      }).catch(() => {});
    }

    return NextResponse.json({ prize, sig }, { status: 201 });
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
