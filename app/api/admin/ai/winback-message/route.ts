import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';
import { generateText } from '@/lib/openai';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { phone?: string; full_name?: string; days_inactive?: number; tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { phone, full_name, days_inactive, tier } = body;
  if (!phone || !full_name || days_inactive == null || !tier) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  const prompt = `Escribe un mensaje corto y cálido de WhatsApp (máx 280 caracteres, en español, tono amigable de restaurante mexicano "3E") para invitar de vuelta a ${full_name}, quien no visita hace ${days_inactive} días y es cliente nivel ${tier}. Incluye un emoji relevante. No incluyas comillas ni explicación, solo el mensaje final.`;

  try {
    const message = await generateText(prompt, { maxTokens: 150, temperature: 0.8 });

    if (!message) {
      return NextResponse.json({ error: 'No se pudo generar el mensaje, intenta de nuevo' }, { status: 502 });
    }

    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO ai_generations (id, type, phone, input_summary, output) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), 'winback_message', phone, JSON.stringify({ phone, full_name, days_inactive, tier }), message]
      );
    } catch {
      // no bloquear la respuesta si falla el log
    }

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: 'No se pudo generar el mensaje, intenta de nuevo' }, { status: 502 });
  }
}
