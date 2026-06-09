import { NextRequest, NextResponse } from 'next/server';
import { insertTicketClaim, getTicketClaimsByRestaurant, calcProportionalPoints, upsertCustomerPoints, getOrCreateStampCard, addStamp, completeStampCard, insertPrize, insertClaim as insertRegularClaim } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { restaurant_id, amount, prize_name, prize_description, full_name, phone, email, location, image_hash } = body;

    if (!restaurant_id || !amount || !prize_name || !full_name || !phone) {
      return NextResponse.json({ error: 'Campos requeridos faltantes' }, { status: 400 });
    }

    const numAmount = Number(amount);
    const customerEmail = email ?? (phone + '@ticket.premia');

    const claim = await insertTicketClaim({
      id: crypto.randomUUID(),
      restaurant_id,
      amount: numAmount,
      prize_name,
      prize_description: prize_description ?? '',
      full_name,
      phone,
      location: location ?? null,
      image_hash: image_hash ?? null,
      expires_at: null,
      redeemed_at: null,
      redeemed_by: null,
      consolation_code: null,
    });

    // Award proportional points (minimum 5)
    const points = calcProportionalPoints(numAmount, 5);
    upsertCustomerPoints(phone, customerEmail, points).catch(() => {});

    // Stamp card: add stamp and auto-complete if threshold reached
    let stampCard = null;
    let stampPrize = null;
    try {
      const card = await getOrCreateStampCard(phone, customerEmail, restaurant_id);
      const updated = await addStamp(card.id);
      stampCard = updated;
      if (updated.stamps_count >= updated.stamps_required && !updated.completed_at) {
        const completed = await completeStampCard(card.id);
        stampCard = completed;
        // Auto-generate consolation prize for stamp card completion
        const today = new Date();
        const expiresDate = new Date(today);
        expiresDate.setDate(expiresDate.getDate() + 30);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const prizeId = crypto.randomUUID();
        const newPrize = await insertPrize({
          id: prizeId,
          name: 'Premio Tarjeta Completa',
          reason: 'Tarjeta de sellos completada',
          start_date: fmt(today),
          end_date: fmt(expiresDate),
          description: '¡Felicidades! Completaste tu tarjeta de sellos. Presenta este premio en caja.',
          location: restaurant_id,
          restaurant_id,
          cancelled: false,
          max_uses: 1,
          generated_by: 'stamp_card',
          game_type: null,
        });
        const newClaim = await insertRegularClaim({
          id: crypto.randomUUID(),
          prize_id: newPrize.id,
          full_name,
          phone,
          email: customerEmail,
          location: null,
          referral_code: null,
          referred_by: null,
        });
        stampPrize = { prize: newPrize, claim: newClaim };
      }
    } catch (stampErr) {
      console.error('stamp card error (non-fatal)', stampErr);
    }

    return NextResponse.json({
      claim,
      folio: claim.id.slice(0, 8).toUpperCase(),
      points_earned: points,
      stamp_card: stampCard ? {
        stamps_count: stampCard.stamps_count,
        stamps_required: stampCard.stamps_required,
        completed: !!stampCard.completed_at,
      } : null,
      stamp_prize: stampPrize ? {
        claim_id: stampPrize.claim.id,
        prize_name: stampPrize.prize.name,
      } : null,
    });
  } catch (err) {
    console.error('ticket-claims POST error', err);
    return NextResponse.json({ error: 'Error al guardar el reclamo' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurant_id');

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurant_id requerido' }, { status: 400 });
  }

  try {
    const claims = await getTicketClaimsByRestaurant(restaurantId);
    return NextResponse.json({ claims });
  } catch (err) {
    console.error('ticket-claims GET error', err);
    return NextResponse.json({ error: 'Error al obtener reclamos' }, { status: 500 });
  }
}
