import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { generateText } from '@/lib/openai';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const allowed = await checkRateLimit(`share-caption:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiadas solicitudes, intenta de nuevo en un momento' }, { status: 429 });
  }

  let body: { prize_name?: string; restaurant_name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { prize_name, restaurant_name } = body;
  if (!prize_name) {
    return NextResponse.json({ error: 'Falta el nombre del premio' }, { status: 400 });
  }

  const prompt = `Escribe un caption corto y divertido para Instagram/WhatsApp Status (máx 150 caracteres, en español, con 2-3 emojis) celebrando que alguien acaba de ganar "${prize_name}" en ${restaurant_name ?? '3E'}. Tono casual y emocionado, como de Gen-Z. No uses comillas.`;

  try {
    const caption = await generateText(prompt, { maxTokens: 100, temperature: 0.9 });

    if (!caption) {
      return NextResponse.json({ error: 'No se pudo generar el caption, intenta de nuevo' }, { status: 502 });
    }

    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO ai_generations (id, type, phone, input_summary, output) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), 'social_caption', null, JSON.stringify({ prize_name, restaurant_name }), caption]
      );
    } catch {
      // no bloquear la respuesta si falla el log
    }

    return NextResponse.json({ caption });
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el caption, intenta de nuevo' }, { status: 502 });
  }
}
