import { NextRequest, NextResponse } from 'next/server';
import { logActivity, getTicketFeedbackStats } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stars, comment, restaurant_id, ticket_claim_id } = body;

    if (!stars || typeof stars !== 'number' || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'stars must be 1–5' }, { status: 400 });
    }
    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }

    await logActivity({
      id: crypto.randomUUID(),
      restaurant_id,
      action: 'ticket_feedback',
      description: `Calificación de ${stars} estrellas`,
      user_name: null,
      metadata: {
        stars,
        comment: comment ?? null,
        ticket_claim_id: ticket_claim_id ?? null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('ticket-feedback POST error', err);
    return NextResponse.json({ error: 'Error al guardar feedback' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurant_id = searchParams.get('restaurant_id');
    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }
    const stats = await getTicketFeedbackStats(restaurant_id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('ticket-feedback GET error', err);
    return NextResponse.json({ error: 'Error al obtener stats' }, { status: 500 });
  }
}
