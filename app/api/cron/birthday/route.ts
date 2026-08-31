import { NextRequest, NextResponse } from 'next/server';
import { getPool, insertPrize, insertClaim, logActivity } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';

// Called daily via cron (e.g. Vercel Cron or external scheduler).
// CRON_SECRET env var protects this endpoint.
export async function GET(req: NextRequest) {
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const authorized =
    !process.env.CRON_SECRET ||
    bearer === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET;
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { rows: birthdays } = await getPool().query<{
    phone: string;
    full_name: string | null;
    email: string;
    tier: string;
  }>(
    `SELECT phone, full_name, email, tier
     FROM customer_points
     WHERE birthday IS NOT NULL
       AND EXTRACT(MONTH FROM birthday) = $1
       AND EXTRACT(DAY FROM birthday) = $2`,
    [month, day]
  );

  if (birthdays.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No hay cumpleaños hoy.' });
  }

  const results: string[] = [];
  const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startDate = today.toISOString().split('T')[0];

  for (const customer of birthdays) {
    const prizeName =
      customer.tier === 'gold'
        ? 'Premio premium de cumpleaños'
        : customer.tier === 'silver'
        ? 'Regalo especial de cumpleaños'
        : 'Surprise de cumpleaños';

    const prizeId = randomUUID();
    try {
      await insertPrize({
        id: prizeId,
        name: prizeName,
        reason: `Cumpleaños de ${customer.full_name ?? customer.phone}`,
        start_date: startDate,
        end_date: endDate,
        description: `¡Feliz cumpleaños! Tienes 7 días para canjear tu regalo.`,
        location: '',
        restaurant_id: null,
        cancelled: false,
        generated_by: 'cron:birthday',
        max_uses: 1,
        photo_url: null,
        campaign_id: null,
      });

      await insertClaim({
        id: randomUUID(),
        prize_id: prizeId,
        full_name: customer.full_name ?? customer.phone,
        phone: customer.phone,
        email: customer.email,
        location: null,
        referral_code: null,
        referred_by: null,
      });

      logActivity({
        id: randomUUID(),
        restaurant_id: null,
        action: 'birthday_prize_generated',
        description: `Premio de cumpleaños generado para ${customer.full_name ?? customer.phone} (${customer.tier})`,
        user_name: 'Sistema',
        metadata: { phone: customer.phone, tier: customer.tier, prize_id: prizeId },
      }).catch(() => {});

      // Notify the customer via WhatsApp or email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://supertierra.mx';
      const firstName = customer.full_name?.split(' ')[0] ?? 'amigo';
      const waText = `🎂 ¡Feliz cumpleaños, ${firstName}! 🎉\n\nTe tenemos un regalo especial por tu día: *${prizeName}*.\n\nTienes 7 días para canjearlo. ¡Te esperamos! 🥳\n\n${appUrl}`;
      const waSent = await sendWhatsApp(customer.phone, waText);

      if (!waSent && customer.email && process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        resend.emails.send({
          from: process.env.RESEND_FROM ?? '3E <no-reply@supertierra.mx>',
          to: customer.email,
          subject: `🎂 ¡Feliz cumpleaños, ${firstName}! Tienes un regalo`,
          html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f9fafb;padding:24px;color:#111827">
<div style="max-width:480px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#0d3d22,#1a6b3c);border-radius:16px;padding:32px;text-align:center;margin-bottom:20px">
    <div style="font-size:48px;margin-bottom:12px">🎂</div>
    <div style="font-size:24px;font-weight:900;color:#fff">¡Feliz cumpleaños, ${firstName}!</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:8px">Tenemos un regalo esperándote</div>
  </div>
  <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e7eb;margin-bottom:16px;text-align:center">
    <div style="font-size:14px;color:#6b7280;margin-bottom:16px">En este día especial, te regalamos:</div>
    <div style="font-size:20px;font-weight:900;color:#F97316;margin-bottom:16px">${prizeName}</div>
    <div style="font-size:13px;color:#9ca3af;margin-bottom:24px">Válido por 7 días · Solo para ti 🎁</div>
    <a href="${appUrl}" style="background:#F97316;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:800;display:inline-block">
      Ir a canjear mi regalo →
    </a>
  </div>
  <div style="font-size:11px;color:#9ca3af;text-align:center">3E · Con cariño, tu restaurante favorito 💚</div>
</div>
</body></html>`,
        }).catch(() => {});
      }

      results.push(customer.phone);
    } catch {
      // Log and continue — don't let one failure block the rest
    }
  }

  return NextResponse.json({ processed: results.length, phones: results });
}
