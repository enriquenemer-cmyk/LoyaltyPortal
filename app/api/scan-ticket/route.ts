import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { getTicketTiersByRestaurant, findTicketClaimByImageHash, getRestaurantTicketConfig, insertTicketClaim, calcProportionalPoints, getActiveEvents, incrementParticipants, logActivity } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

function findMatchingTier(tiers: Awaited<ReturnType<typeof getTicketTiersByRestaurant>>, amount: number) {
  for (const tier of tiers) {
    const min = Number(tier.min_amount);
    const max = tier.max_amount !== null ? Number(tier.max_amount) : Infinity;
    if (amount >= min && amount <= max) return tier;
  }
  return null;
}

export async function POST(req: NextRequest) {
  // Rate limit check outside try so errors here don't produce a 500
  const ip = getClientIp(req);
  if (!await checkRateLimit(`scan_ticket_${ip}`, 20, 60 * 1000)) {
    logActivity({
      id: randomUUID(),
      restaurant_id: null,
      action: 'rate_limit_exceeded',
      description: `Rate limit excedido en /api/scan-ticket (IP: ${ip})`,
      user_name: 'API',
      metadata: { ip, endpoint: '/api/scan-ticket' },
    }).catch(() => {});
    return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const restaurantId = formData.get('restaurant_id') as string | null;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id requerido' }, { status: 400 });
    }

    const tiers = await getTicketTiersByRestaurant(restaurantId);

    // Fetch active events and compute effects
    const activeEvents = await getActiveEvents(restaurantId);
    const doublePointsEvent = activeEvents.find((e) => e.event_type === 'double_points') ?? null;
    const firstNEvent = activeEvents.find((e) => e.event_type === 'first_N') ?? null;
    const minBoostEvent = activeEvents.find((e) => e.event_type === 'min_amount_boost') ?? null;

    const eventBanner = activeEvents.length > 0
      ? {
          id: activeEvents[0].id,
          name: activeEvents[0].name,
          event_type: activeEvents[0].event_type,
          multiplier: Number(activeEvents[0].multiplier),
          max_participants: activeEvents[0].max_participants,
          participants_count: activeEvents[0].participants_count,
        }
      : null;

    function getAdjustedTiers(): typeof tiers {
      if (!minBoostEvent) return tiers;
      const factor = 1 - Number(minBoostEvent.multiplier) / 100;
      return tiers.map((t) => ({
        ...t,
        min_amount: Number(t.min_amount) * factor,
        max_amount: t.max_amount !== null ? Number(t.max_amount) * factor : null,
      })) as typeof tiers;
    }

    function applyFirstNBonus(): { name: string; description: string } | null {
      if (!firstNEvent) return null;
      if (firstNEvent.max_participants !== null && firstNEvent.participants_count >= firstNEvent.max_participants) return null;
      incrementParticipants(firstNEvent.id).catch(() => {});
      return {
        name: `Bonus: ${firstNEvent.name}`,
        description: `¡Eres uno de los primeros ${firstNEvent.max_participants ?? '?'} participantes del evento!`,
      };
    }

    // DEMO MODE: if no API key, generate random amount
    if (!process.env.OPENAI_API_KEY) {
      const demoAmount = Math.round((80 + Math.random() * 570) * 100) / 100;
      const tier = findMatchingTier(getAdjustedTiers(), demoAmount);
      const config = await getRestaurantTicketConfig(restaurantId);
      const DEFAULT_CONSOLATION = { name: 'Premio de consolación', description: '¡Gracias por visitarnos! Vuelve pronto.' };

      if (!tier) {
        const consolationCode = 'CONS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await insertTicketClaim({
          id: crypto.randomUUID(),
          restaurant_id: restaurantId,
          amount: demoAmount,
          prize_name: config?.consolation_prize_name ?? DEFAULT_CONSOLATION.name,
          prize_description: config?.consolation_prize_description ?? DEFAULT_CONSOLATION.description,
          full_name: 'Demo',
          phone: '0000000000',
          location: null,
          image_hash: null,
          expires_at: expiresAt,
          redeemed_at: null,
          redeemed_by: null,
          consolation_code: consolationCode,
        }).catch(() => {});
        const firstNBonus = applyFirstNBonus();
        return NextResponse.json({
          amount: demoAmount,
          tier: null,
          consolation: {
            name: firstNBonus?.name ?? config?.consolation_prize_name ?? DEFAULT_CONSOLATION.name,
            description: firstNBonus?.description ?? config?.consolation_prize_description ?? DEFAULT_CONSOLATION.description,
            code: consolationCode,
            is_consolation: true,
          },
          first_n_bonus: firstNBonus,
          event: eventBanner,
          message: `Tu compra de $${demoAmount.toFixed(2)} no alcanza el mínimo para un premio`,
          demo: true,
          demo_note: '⚠️ Modo demo — configura OPENAI_API_KEY para leer tickets reales',
        });
      }

      const multiplierNoteDemoTier = doublePointsEvent
        ? ` (x${doublePointsEvent.multiplier} puntos — ${doublePointsEvent.name})`
        : '';
      const firstNBonusTier = applyFirstNBonus();
      return NextResponse.json({
        amount: demoAmount,
        tier: {
          prize_name: tier.prize_name + multiplierNoteDemoTier,
          prize_description: tier.prize_description,
          game_type: tier.game_type ?? null,
        },
        first_n_bonus: firstNBonusTier,
        event: eventBanner,
        consolation: null,
        message: `¡Tu compra de $${demoAmount.toFixed(2)} califica para ${tier.prize_name}!`,
        demo: true,
        demo_note: '⚠️ Modo demo — configura OPENAI_API_KEY para leer tickets reales',
      });
    }

    if (!file) {
      return NextResponse.json({ error: 'imagen requerida' }, { status: 400 });
    }

    // Convert file to buffer and compute hash for anti-fraud
    const buffer = Buffer.from(await file.arrayBuffer());
    const imageHash = createHash('md5').update(buffer).digest('hex');

    // Check for duplicate image
    const existing = await findTicketClaimByImageHash(imageHash);
    if (existing) {
      return NextResponse.json(
        { error: 'Este ticket ya fue utilizado.', duplicate: true },
        { status: 409 }
      );
    }

    const base64Image = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    // Dynamically import openai
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const todayStr = new Date().toISOString().slice(0, 10);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analiza este ticket. Extrae DOS cosas:
1. ¿Es ticket de restaurante/comida? Si NO es restaurante: responde INVALIDO
2. MONTO: total final (número solo, ej: 245.50)
3. FECHA: fecha del ticket formato YYYY-MM-DD
Formato respuesta: MONTO:245.50|FECHA:2026-06-07
Si no es restaurante: INVALIDO
Si no lees monto: NONE
Si no lees fecha: MONTO:245.50|FECHA:UNKNOWN`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      }],
      max_tokens: 80,
    });

    const rawText = response.choices[0].message.content?.trim() ?? 'NONE';

    // Handle invalid (non-restaurant) ticket
    if (rawText === 'INVALIDO') {
      return NextResponse.json({
        amount: null,
        tier: null,
        message: 'El ticket no es de un restaurante.',
        error: 'El ticket no es de un restaurante.',
        invalid: true,
      });
    }

    if (rawText === 'NONE' || rawText === '') {
      return NextResponse.json({
        amount: null,
        tier: null,
        message: 'No pudimos leer el monto del ticket',
        error_type: 'unreadable',
      });
    }

    // Parse MONTO:xxx|FECHA:xxx
    let amountText = rawText;
    let ticketDate: string | null = null;

    const montoMatch = rawText.match(/MONTO:([0-9.,]+)/);
    const fechaMatch = rawText.match(/FECHA:([^\s|]+)/);

    if (montoMatch) {
      amountText = montoMatch[1];
      ticketDate = fechaMatch ? fechaMatch[1] : null;
    }

    const amount = parseFloat(amountText.replace(',', '.'));

    if (isNaN(amount)) {
      return NextResponse.json({
        amount: null,
        tier: null,
        message: 'No pudimos leer el monto del ticket',
        error_type: 'unreadable',
      });
    }

    // Check ticket date — reject if not today and not UNKNOWN
    if (ticketDate && ticketDate !== 'UNKNOWN' && ticketDate !== todayStr) {
      return NextResponse.json({
        amount: null,
        tier: null,
        message: 'Solo se aceptan tickets del día actual.',
        error: 'Solo se aceptan tickets del día actual.',
        outdated: true,
      });
    }

    const tier = findMatchingTier(getAdjustedTiers(), amount);
    const config = await getRestaurantTicketConfig(restaurantId);
    const DEFAULT_CONSOLATION = { name: 'Premio de consolación', description: '¡Gracias por visitarnos! Vuelve pronto.' };

    if (!tier) {
      const consolationCode = 'CONS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      // Store the consolation claim non-blocking
      insertTicketClaim({
        id: crypto.randomUUID(),
        restaurant_id: restaurantId,
        amount,
        prize_name: config?.consolation_prize_name ?? DEFAULT_CONSOLATION.name,
        prize_description: config?.consolation_prize_description ?? DEFAULT_CONSOLATION.description,
        full_name: 'Pendiente',
        phone: '0000000000',
        location: null,
        image_hash: imageHash,
        expires_at: expiresAt,
        redeemed_at: null,
        redeemed_by: null,
        consolation_code: consolationCode,
      }).catch(() => {});
      // Award proportional points for ticket scan (double if event active)
      const consolationPoints = calcProportionalPoints(amount, 5) * (doublePointsEvent ? Number(doublePointsEvent.multiplier) : 1);
      const firstNBonusReal = applyFirstNBonus();
      return NextResponse.json({
        amount,
        image_hash: imageHash,
        points_earned: consolationPoints,
        tier: null,
        consolation: {
          name: firstNBonusReal?.name ?? config?.consolation_prize_name ?? DEFAULT_CONSOLATION.name,
          description: firstNBonusReal?.description ?? config?.consolation_prize_description ?? DEFAULT_CONSOLATION.description,
          code: consolationCode,
          is_consolation: true,
        },
        first_n_bonus: firstNBonusReal,
        event: eventBanner,
        message: `Tu compra de $${amount.toFixed(2)} no alcanza el mínimo para un premio`,
      });
    }

    const tierPoints = calcProportionalPoints(amount, 5) * (doublePointsEvent ? Number(doublePointsEvent.multiplier) : 1);
    const multiplierNoteReal = doublePointsEvent
      ? ` (x${doublePointsEvent.multiplier} puntos — ${doublePointsEvent.name})`
      : '';
    const firstNBonusTierReal = applyFirstNBonus();
    return NextResponse.json({
      amount,
      image_hash: imageHash,
      points_earned: tierPoints,
      tier: {
        prize_name: tier.prize_name + multiplierNoteReal,
        prize_description: tier.prize_description,
        game_type: tier.game_type ?? null,
      },
      first_n_bonus: firstNBonusTierReal,
      event: eventBanner,
      consolation: null,
      message: `¡Tu compra de $${amount.toFixed(2)} califica para ${tier.prize_name}!`,
    });
  } catch (err) {
    console.error('scan-ticket error', err);
    return NextResponse.json({ error: 'Error al procesar el ticket' }, { status: 500 });
  }
}
