/**
 * Post-visit survey cron — runs every 30 min or hourly.
 * Finds claims completed ~2h ago and sends a follow-up message
 * asking for feedback. Uses WhatsApp if configured, otherwise
 * falls back to email via Resend.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPool, logActivity } from '@/lib/db';
import { sendWhatsApp } from '@/lib/whatsapp';
import { Resend } from 'resend';
import { randomUUID } from 'crypto';

function auth(req: NextRequest) {
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  return (
    !process.env.CRON_SECRET ||
    bearer === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET
  );
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pool = getPool();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://supertierra.mx';

  // Find claims delivered 1.5h–3h ago that haven't been surveyed yet
  const { rows: claimsToSurvey } = await pool.query<{
    id: string;
    phone: string;
    full_name: string;
    email: string;
    prize_name: string;
    delivered_by: string | null;
  }>(
    `SELECT c.id, c.phone, c.full_name, c.email, p.name AS prize_name, c.delivered_by
     FROM claims c
     JOIN prizes p ON c.prize_id = p.id
     WHERE c.status = 'delivered'
       AND c.delivered_at >= NOW() - INTERVAL '3 hours'
       AND c.delivered_at < NOW() - INTERVAL '90 minutes'
       AND c.survey_sent_at IS NULL
     LIMIT 50`
  ).catch(() => ({ rows: [] }));

  if (claimsToSurvey.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'No hay canjes listos para encuesta.' });
  }

  // Check if survey_sent_at column exists — add it if not
  await pool.query(
    `ALTER TABLE claims ADD COLUMN IF NOT EXISTS survey_sent_at TIMESTAMPTZ`
  ).catch(() => {});

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  const results: { phone: string; channel: string }[] = [];

  for (const claim of claimsToSurvey) {
    const surveyUrl = `${appUrl}/feedback/${claim.id}`;
    const name = claim.full_name?.split(' ')[0] ?? 'amigo';

    let sent = false;

    // Try WhatsApp first
    const waText = `¡Hola ${name}! 👋 Acabas de canjear *${claim.prize_name}* con nosotros. ¿Cómo fue tu experiencia?\n\n⭐ Cuéntanos en 30 segundos: ${surveyUrl}\n\n¡Tu opinión nos ayuda a mejorar!`;
    const waSent = await sendWhatsApp(claim.phone, waText);
    if (waSent) {
      sent = true;
      results.push({ phone: claim.phone, channel: 'whatsapp' });
    }

    // Fallback: email
    if (!sent && resend && claim.email) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM ?? '3E <no-reply@supertierra.mx>',
          to: claim.email,
          subject: `¿Cómo fue tu experiencia con ${claim.prize_name}?`,
          html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,sans-serif;background:#f9fafb;padding:24px;color:#111827">
<div style="max-width:480px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#0d3d22,#1a6b3c);border-radius:16px;padding:28px;text-align:center;margin-bottom:20px">
    <div style="font-size:32px;margin-bottom:8px">⭐</div>
    <div style="font-size:20px;font-weight:900;color:#fff">¿Cómo estuvo tu premio?</div>
  </div>
  <div style="background:white;border-radius:12px;padding:24px;border:1px solid #e5e7eb;margin-bottom:16px">
    <p style="font-size:15px;color:#374151">Hola <strong>${name}</strong>,</p>
    <p style="font-size:14px;color:#6b7280">Acabas de canjear <strong>${claim.prize_name}</strong>. Nos importa mucho saber cómo fue tu experiencia.</p>
    <div style="text-align:center;margin:24px 0">
      <a href="${surveyUrl}" style="background:#F97316;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;display:inline-block">
        Calificar mi experiencia →
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center">Solo toma 30 segundos 🙏</p>
  </div>
  <div style="font-size:11px;color:#9ca3af;text-align:center">3E · <a href="${appUrl}" style="color:#9ca3af">supertierra.mx</a></div>
</div>
</body></html>`,
        });
        sent = true;
        results.push({ phone: claim.phone, channel: 'email' });
      } catch {
        // ignore email failure
      }
    }

    if (sent) {
      // Mark as surveyed
      await pool.query(
        `UPDATE claims SET survey_sent_at = NOW() WHERE id = $1`,
        [claim.id]
      ).catch(() => {});

      logActivity({
        id: randomUUID(),
        restaurant_id: null,
        action: 'survey_sent',
        description: `Encuesta post-visita enviada a ${claim.full_name ?? claim.phone} (${claim.prize_name})`,
        user_name: 'Sistema',
        metadata: { claim_id: claim.id, channel: results[results.length - 1]?.channel },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
