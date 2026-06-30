import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { randomUUID } from 'crypto';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool, getCustomerPoints, ensureSchema } from '@/lib/db';
import { generateImage } from '@/lib/openai';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

const TIER_STYLE: Record<string, string> = {
  gold: 'a luxurious golden loyalty card with intricate geometric patterns, sparkling gold foil texture, premium and elegant, Mexican-inspired decorative motifs',
  silver: 'a sleek silver loyalty card with modern minimalist patterns, metallic shine, clean geometric design',
  bronze: 'a warm bronze/copper loyalty card with rustic textured patterns, earthy tones, friendly approachable design',
};

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let phone: string;
  try {
    const body = await req.json();
    phone = (body.phone ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  if (!phone) {
    return NextResponse.json({ error: 'Falta el teléfono del cliente' }, { status: 400 });
  }

  await ensureSchema();
  const pool = getPool();

  try {
    // Rate-limit: reuse existing card if generated in last 30 days
    const { rows: existing } = await pool.query(
      `SELECT image_url, prompt_used, created_at FROM ai_customer_cards
       WHERE phone = $1 AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );
    if (existing[0]) {
      return NextResponse.json({ image_url: existing[0].image_url, is_new: false });
    }

    const customerPoints = await getCustomerPoints(phone);
    const tier = customerPoints?.tier ?? 'bronze';
    const style = TIER_STYLE[tier] ?? TIER_STYLE.bronze;

    const prompt = `Digital illustration of ${style}, no text or letters on the card, abstract decorative background art, vibrant colors, professional graphic design, square format, no people or faces`;

    const imageUrl = await generateImage(prompt);
    if (!imageUrl) {
      return NextResponse.json({ error: 'No se pudo generar la imagen, intenta de nuevo' }, { status: 502 });
    }

    const id = randomUUID();
    await pool.query(
      `INSERT INTO ai_customer_cards (id, phone, image_url, prompt_used) VALUES ($1, $2, $3, $4)`,
      [id, phone, imageUrl, prompt]
    );

    return NextResponse.json({ image_url: imageUrl, is_new: true });
  } catch (err) {
    console.error('[/api/admin/ai/generate-card]', err);
    return NextResponse.json(
      { error: 'No se pudo generar la tarjeta IA. Intenta de nuevo en unos minutos.' },
      { status: 500 }
    );
  }
}
