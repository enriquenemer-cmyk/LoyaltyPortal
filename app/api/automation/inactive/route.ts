import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, createHmac } from 'crypto';
import { getPool, getClaimsByContact, getCustomerPoints, insertPrize, insertClaim, logActivity } from '@/lib/db';
import { getSession } from '@/lib/session';
import { generateText } from '@/lib/openai';
import { sendWinbackEmail } from '@/lib/email';

// Accept Vercel Cron's automatic `Authorization: Bearer <CRON_SECRET>` header,
// as well as the manual `x-cron-secret` header / `secret` query param conventions
// used by the other cron routes for local testing.
function isCronAuthorized(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true;
  const bearer = req.headers.get('authorization');
  if (bearer === `Bearer ${process.env.CRON_SECRET}`) return true;
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  return secret === process.env.CRON_SECRET;
}

// Don't re-target the same customer with an AI winback within this window,
// even if the cron/manual trigger runs again before they come back.
const WINBACK_COOLDOWN_DAYS = 14;
// Cap how many customers get a full AI + prize + push + email treatment per
// run, to keep OpenAI cost/latency and email volume predictable. The rest
// still show up in the response list with a generic wa_url for manual outreach.
const MAX_AI_WINBACKS_PER_RUN = 20;

type InactiveCustomer = {
  phone: string;
  email: string;
  full_name: string;
  last_claim_date: string;
  days_inactive: number;
};

type WinbackContent = {
  message: string;
  prize_name: string;
  prize_reason: string;
  prize_description: string;
};

async function wasRecentlyWinbacked(phone: string): Promise<boolean> {
  const { rows } = await getPool().query(
    `SELECT 1 FROM ai_generations
     WHERE type = 'auto_winback' AND phone = $1 AND created_at > NOW() - INTERVAL '1 day' * $2
     LIMIT 1`,
    [phone, WINBACK_COOLDOWN_DAYS]
  );
  return rows.length > 0;
}

async function generateWinbackContent(customer: InactiveCustomer): Promise<WinbackContent> {
  const [claims, points] = await Promise.all([
    getClaimsByContact(customer.phone).catch(() => []),
    getCustomerPoints(customer.phone).catch(() => undefined),
  ]);

  const firstName = customer.full_name.split(' ')[0];
  const tier = points?.tier ?? 'bronze';
  const history = claims.slice(0, 5).map((c) => c.prize_name).join(', ') || 'sin historial de premios';

  const prompt = `Eres el sistema de marketing de "3E", una plataforma de premios de fidelidad para restaurantes. Un cliente lleva ${customer.days_inactive} días sin visitarnos.

Cliente: ${firstName}, nivel ${tier}, premios anteriores: ${history}.

Genera SOLO un objeto JSON (sin markdown, sin backticks, sin texto extra) con esta forma exacta:
{"message": "mensaje corto y cálido en español (máx 220 caracteres) invitándolo a volver, con 1 emoji, mencionando el premio por su nombre", "prize_name": "nombre corto de un premio de regreso (máx 4 palabras)", "prize_reason": "reactivación IA", "prize_description": "descripción breve del premio en una frase"}

El premio debe sentirse hecho a medida para este cliente según su historial y nivel, no genérico.`;

  try {
    const raw = await generateText(prompt, { maxTokens: 300, temperature: 0.9 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.message && parsed.prize_name) {
        return {
          message: String(parsed.message).slice(0, 400),
          prize_name: String(parsed.prize_name).slice(0, 80),
          prize_reason: String(parsed.prize_reason ?? 'Reactivación IA').slice(0, 120),
          prize_description: String(parsed.prize_description ?? '').slice(0, 300) || `Premio de regreso para ${firstName}`,
        };
      }
    }
  } catch {
    // fall through to default below
  }

  return {
    message: `¡Hola ${firstName}! Te extrañamos en 3E 🌯 Tenemos un premio especial de regreso esperándote.`,
    prize_name: 'Premio de regreso',
    prize_reason: 'Reactivación automática',
    prize_description: `Premio de regreso para ${firstName}, quien no visitaba hace ${customer.days_inactive} días.`,
  };
}

async function issueWinbackPrize(customer: InactiveCustomer, content: WinbackContent, appUrl: string) {
  const prizeId = randomUUID();
  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  await insertPrize({
    id: prizeId,
    name: content.prize_name,
    reason: content.prize_reason,
    start_date: startDate,
    end_date: endDate,
    description: content.prize_description,
    location: '',
    restaurant_id: null,
    cancelled: false,
    generated_by: 'automation:winback_ai',
    max_uses: 1,
    photo_url: null,
    campaign_id: null,
  });

  await insertClaim({
    id: randomUUID(),
    prize_id: prizeId,
    full_name: customer.full_name,
    phone: customer.phone,
    email: customer.email,
    location: null,
    referral_code: null,
    referred_by: null,
  });

  const secret = process.env.SESSION_SECRET ?? 'fallback-secret';
  const sig = createHmac('sha256', secret).update(prizeId).digest('hex').slice(0, 16);

  return `${appUrl}/premio/${prizeId}?sig=${sig}`;
}

async function runInactiveAutomation(days: number, execute: boolean) {
  try {
    const { rows } = await getPool().query<{
      phone: string;
      email: string;
      full_name: string;
      last_claim_date: string;
    }>(`
      SELECT DISTINCT ON (phone)
        phone,
        email,
        full_name,
        MAX(claimed_at) OVER (PARTITION BY phone) AS last_claim_date
      FROM claims
      WHERE phone NOT IN (
        SELECT DISTINCT phone
        FROM claims
        WHERE claimed_at >= NOW() - INTERVAL '1 day' * $1
      )
      ORDER BY phone, claimed_at DESC
    `, [days]);

    const now = Date.now();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://premia-tierra.vercel.app';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? appUrl;

    const inactiveCustomers: InactiveCustomer[] = rows
      .map((row) => ({
        phone: row.phone,
        email: row.email,
        full_name: row.full_name,
        last_claim_date: row.last_claim_date,
        days_inactive: Math.floor((now - new Date(row.last_claim_date).getTime()) / (1000 * 60 * 60 * 24)),
      }))
      .sort((a, b) => b.days_inactive - a.days_inactive);

    let messaged = 0;
    let skippedCooldown = 0;
    let failed = 0;

    const customers = await Promise.all(
      inactiveCustomers.map(async (customer, index) => {
        const firstName = customer.full_name.split(' ')[0];
        let message = `¡Hola ${firstName}! Te extrañamos en 3E 🌯 Aquí tienes un premio especial de regreso.`;
        let prizeUrl = `${appUrl}/mis-premios`;

        if (execute && index < MAX_AI_WINBACKS_PER_RUN) {
          try {
            if (await wasRecentlyWinbacked(customer.phone)) {
              skippedCooldown++;
            } else {
              const content = await generateWinbackContent(customer);
              prizeUrl = await issueWinbackPrize(customer, content, appUrl);
              message = content.message;

              await Promise.allSettled([
                fetch(`${baseUrl}/api/push/send`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(process.env.CRON_SECRET ? { 'x-internal-secret': process.env.CRON_SECRET } : {}),
                  },
                  body: JSON.stringify({
                    phone: customer.phone,
                    title: `¡Te extrañamos, ${firstName}! 🌯`,
                    body: message,
                    url: prizeUrl,
                  }),
                }),
                sendWinbackEmail({
                  to: customer.email,
                  full_name: customer.full_name,
                  message,
                  prize_name: content.prize_name,
                  prize_url: prizeUrl,
                }),
              ]);

              await getPool().query(
                `INSERT INTO ai_generations (id, type, phone, input_summary, output) VALUES ($1, $2, $3, $4, $5)`,
                [randomUUID(), 'auto_winback', customer.phone, JSON.stringify({ days_inactive: customer.days_inactive }), message]
              );
              await logActivity({
                id: randomUUID(),
                restaurant_id: null,
                action: 'auto_winback',
                description: `Reactivación IA enviada a ${customer.full_name} (${customer.days_inactive} días inactivo): ${content.prize_name}`,
                user_name: 'sistema',
                metadata: { phone: customer.phone, prize_name: content.prize_name },
              });
              messaged++;
            }
          } catch (err) {
            console.error('winback automation error for', customer.phone, err);
            failed++;
          }
        }

        const waUrl = `https://wa.me/${customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`${message} ${prizeUrl}`)}`;
        return { ...customer, wa_url: waUrl, message, prize_url: prizeUrl };
      })
    );

    return NextResponse.json({
      customers,
      total: customers.length,
      days_threshold: days,
      executed: execute,
      ai_messaged: messaged,
      skipped_cooldown: skippedCooldown,
      failed,
    });
  } catch (error) {
    console.error('Error fetching inactive customers:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

// Called manually from the admin UI. By default this is a preview only (no
// prizes issued, no emails/push sent) — the admin must pass `execute: true`
// explicitly to actually trigger the AI winback pipeline for real customers.
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const days = parseInt(body.days ?? '30', 10) || 30;
  const execute = body.execute === true;
  return runInactiveAutomation(days, execute);
}

// Called daily/weekly via cron (e.g. Vercel Cron). CRON_SECRET env var protects
// this endpoint. Cron runs always execute for real — that's the point of the
// automation running unattended.
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10) || 30;
  return runInactiveAutomation(days, true);
}
