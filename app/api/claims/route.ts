import { NextRequest, NextResponse } from 'next/server';
import { insertClaim, getAllClaims, getPrizeById, getPrizeClaimCount, logActivity, getRecentClaimsByContact, getAllPrizeRules, insertPrize, countClaimsByContact, createNotification, upsertCustomerPoints, getPool } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  // Rate limiting: max 10 claims per hour per IP
  const ip = getClientIp(request);
  if (!await checkRateLimit(`claims_${ip}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo en una hora.' }, { status: 429 });
  }

  try {

    const body = await request.json();
    const { prize_id, full_name, phone, email, location, referral_code, referred_by } = body;

    if (!prize_id || !full_name || !phone || !email) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 });
    }

    const prize = await getPrizeById(prize_id);
    if (!prize) return NextResponse.json({ error: 'Premio no encontrado.' }, { status: 404 });
    if (prize.cancelled) return NextResponse.json({ error: 'Este premio fue cancelado.' }, { status: 409 });

    const today = new Date().toISOString().split('T')[0];
    if (today > prize.end_date) return NextResponse.json({ error: 'Este premio ha expirado.' }, { status: 409 });

    const claimCount = await getPrizeClaimCount(prize_id);
    const maxUses = prize.max_uses ?? 1;
    if (claimCount >= maxUses) {
      const msg = maxUses > 1
        ? `Este premio ya alcanzó su límite de ${maxUses} usos.`
        : 'Este QR ya fue utilizado. Solo se puede canjear una vez.';
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    // Global stock limit check across all QRs for this prize
    if (prize.stock_limit != null) {
      const { getPool } = await import('@/lib/db');
      const { rows: stockRows } = await getPool().query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM claims WHERE prize_id = $1`,
        [prize_id]
      );
      const totalClaims = parseInt(stockRows[0].count, 10);
      if (totalClaims >= prize.stock_limit) {
        return NextResponse.json(
          { error: 'Este premio ya alcanzó su límite de canjes disponibles.' },
          { status: 409 }
        );
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 });

    // Weekly prize limit check
    const weeklyLimit = parseInt(process.env.PRIZE_WEEKLY_LIMIT ?? '3', 10);
    const [weeklyByPhone, weeklyByEmail] = await Promise.all([
      getRecentClaimsByContact(phone, 7),
      getRecentClaimsByContact(email, 7),
    ]);
    const weeklyIds = new Set<string>();
    [...weeklyByPhone, ...weeklyByEmail].forEach(c => weeklyIds.add(c.id));
    if (weeklyIds.size >= weeklyLimit) {
      return NextResponse.json({
        error: `Has alcanzado el límite de ${weeklyLimit} premios por semana. Puedes reclamar otro la próxima semana.`,
        code: 'weekly_limit',
      }, { status: 409 });
    }

    // Duplicate detection: check if phone OR email already claimed in last 30 days
    const [recentByPhone, recentByEmail] = await Promise.all([
      getRecentClaimsByContact(phone),
      getRecentClaimsByContact(email),
    ]);

    // Merge and deduplicate by claim id
    const seenIds = new Set<string>();
    const recentClaims = [...recentByPhone, ...recentByEmail].filter(c => {
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });

    const id = randomUUID();
    const claim = await insertClaim({
      id, prize_id, full_name, phone, email,
      location: location || null,
      referral_code: referral_code || null,
      referred_by: referred_by || null,
    });

    // Dispatch claim_created webhook (non-blocking)
    import('@/lib/dispatchWebhook').then(({ dispatchWebhook }) => {
      dispatchWebhook('claim_created', { id, phone, email, full_name, prize_id, prize_name: prize.name });
    }).catch(() => {});

    // Non-blocking prize rules engine
    (async () => {
      try {
        const rules = await getAllPrizeRules();
        const activeRules = rules.filter(r => r.active);
        if (activeRules.length === 0) return;

        // Count total claims for this contact (includes the one just created)
        const totalClaims = await countClaimsByContact(phone || email);

        for (const rule of activeRules) {
          // Filter by restaurant if rule is restaurant-specific
          if (rule.restaurant_id && prize.restaurant_id && rule.restaurant_id !== prize.restaurant_id) continue;

          if (rule.trigger_type === 'nth_claim') {
            // Fire on every Nth claim (exact multiple)
            if (totalClaims > 0 && totalClaims % rule.trigger_value === 0) {
              const now = new Date();
              const endDate = new Date(now.getTime() + rule.validity_days * 24 * 60 * 60 * 1000);
              const prizeId = randomUUID();
              await insertPrize({
                id: prizeId,
                name: rule.prize_template,
                reason: rule.prize_reason,
                start_date: now.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                description: rule.prize_description,
                location: prize.location ?? '',
                restaurant_id: rule.restaurant_id ?? prize.restaurant_id ?? null,
                cancelled: false,
                generated_by: `rule:${rule.id}`,
                max_uses: 1,
                photo_url: null,
                campaign_id: null,
              });
              // Auto-claim the generated prize for the customer
              await insertClaim({
                id: randomUUID(),
                prize_id: prizeId,
                full_name,
                phone,
                email,
                location: location || null,
                referral_code: null,
                referred_by: null,
              });
              logActivity({
                id: randomUUID(),
                restaurant_id: rule.restaurant_id ?? prize.restaurant_id ?? null,
                action: 'prize_rule_triggered',
                description: `Regla "${rule.name}" activada para ${full_name} (cobro #${totalClaims}): ${rule.prize_template}`,
                user_name: full_name,
                metadata: { rule_id: rule.id, claim_id: id, generated_prize_id: prizeId, total_claims: totalClaims },
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('Prize rules engine error:', err);
      }
    })();

    // Referral reward: award 50 points to the referrer on first claim of referred customer
    if (referred_by) {
      (async () => {
        try {
          // Only reward on first-ever claim by this phone/email
          const totalByPhone = await countClaimsByContact(phone);
          const totalByEmail = await countClaimsByContact(email);
          if (totalByPhone <= 1 && totalByEmail <= 1) {
            // Find referrer's phone from their referral_code
            const { rows } = await getPool().query<{ phone: string; email: string }>(
              `SELECT DISTINCT phone, email FROM claims WHERE referral_code = $1 LIMIT 1`,
              [referred_by]
            );
            if (rows[0]) {
              await upsertCustomerPoints(rows[0].phone, rows[0].email, 50);
              logActivity({
                id: randomUUID(),
                restaurant_id: prize.restaurant_id ?? null,
                action: 'referral_reward',
                description: `+50 puntos a ${rows[0].phone} por referido exitoso (${full_name})`,
                user_name: 'Sistema',
                metadata: { referral_code: referred_by, referred_phone: phone, points: 50 },
              }).catch(() => {});
            }
          }
        } catch { /* ignore */ }
      })();
    }

    // Non-blocking webhook trigger
    if (process.env.WEBHOOK_URL) {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'claim.registered',
          data: {
            claim_id: id,
            prize_id,
            prize_name: prize.name,
            full_name,
            phone,
            email,
            location: location || null,
            claimed_at: new Date().toISOString(),
          },
        }),
      }).catch(() => {});
    }

    if (prize.restaurant_id) {
      logActivity({
        id: randomUUID(),
        restaurant_id: prize.restaurant_id,
        action: 'claim_registered',
        description: `${full_name} registró el premio: ${prize.name}`,
        user_name: full_name,
        metadata: { claim_id: id, prize_id },
      }).catch(() => {});

      createNotification({
        type: 'new_claim',
        title: 'Nuevo cobro registrado',
        body: `${full_name} registró: ${prize.name}`,
        link: '/admin/registros',
        restaurant_id: prize.restaurant_id,
      }).catch(() => {});
    }

    const response: { claim: typeof claim; warning?: string; recent_claims_count?: number } = { claim };

    if (recentClaims.length > 0) {
      const first = recentClaims[0];
      const date = new Date(first.claimed_at).toLocaleDateString('es-ES', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      const contact = first.email === email ? email : first.phone;
      response.warning = `Este cliente ya reclamó un premio recientemente (${contact} en ${date})`;
      response.recent_claims_count = recentClaims.length;
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating claim:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Duplicate check endpoint: ?duplicate_check=phone_or_email
    const duplicateCheck = searchParams.get('duplicate_check');
    if (duplicateCheck) {
      const recentClaims = await getRecentClaimsByContact(duplicateCheck);
      return NextResponse.json({ claims: recentClaims, count: recentClaims.length });
    }

    const status = searchParams.get('status') as 'pending' | 'delivered' | null;
    const since = searchParams.get('since') ?? undefined;
    const offsetParam = searchParams.get('offset');
    const limitParam = searchParams.get('limit');
    const opts = (offsetParam != null || limitParam != null) ? {
      offset: offsetParam != null ? parseInt(offsetParam, 10) : undefined,
      limit: limitParam != null ? parseInt(limitParam, 10) : undefined,
    } : undefined;
    const claims = await getAllClaims(status ?? undefined, since, opts);
    return NextResponse.json({ claims });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
