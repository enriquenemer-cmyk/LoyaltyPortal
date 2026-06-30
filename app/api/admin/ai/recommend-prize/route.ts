import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool, getClaimsByContact, getCustomerPoints } from '@/lib/db';
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

  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { phone } = body;
  if (!phone) {
    return NextResponse.json({ error: 'Falta el teléfono' }, { status: 400 });
  }

  try {
    const [claims, customerPoints] = await Promise.all([
      getClaimsByContact(phone),
      getCustomerPoints(phone),
    ]);

    const recentClaims = claims.slice(0, 10);
    const historyList = recentClaims.length
      ? recentClaims.map((c) => `${c.prize_name} (${new Date(c.claimed_at).toLocaleDateString('es-MX')})`).join(', ')
      : 'sin historial de premios canjeados';

    const tier = customerPoints?.tier ?? 'bronze';
    const points = customerPoints?.total_points ?? 0;

    const prompt = `Basado en este historial de premios canjeados: ${historyList}, y que es nivel ${tier} con ${points} puntos, recomienda UN tipo de premio que más le gustaría a este cliente y por qué, en una sola frase concisa, en español.`;

    const recommendation = await generateText(prompt, { maxTokens: 120, temperature: 0.8 });

    if (!recommendation) {
      return NextResponse.json({ error: 'No se pudo generar la recomendación, intenta de nuevo' }, { status: 502 });
    }

    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO ai_generations (id, type, phone, input_summary, output) VALUES ($1, $2, $3, $4, $5)`,
        [crypto.randomUUID(), 'prize_recommendation', phone, JSON.stringify({ phone, tier, points, recentClaims: recentClaims.map(c => c.prize_name) }), recommendation]
      );
    } catch {
      // no bloquear la respuesta si falla el log
    }

    return NextResponse.json({ recommendation });
  } catch {
    return NextResponse.json({ error: 'No se pudo generar la recomendación, intenta de nuevo' }, { status: 502 });
  }
}
