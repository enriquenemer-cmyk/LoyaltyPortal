// SCAFFOLD: requires WhatsApp Business Cloud API (Meta) or Twilio WhatsApp setup.
// Once configured, Meta/Twilio will POST incoming messages here.
// Env vars needed: WHATSAPP_VERIFY_TOKEN, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID
import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

// Meta requires a GET verification handshake
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'WhatsApp Cloud API no configurado.' }, { status: 501 });
  }
  const body = await req.json();
  // Parse incoming message structure (Meta Cloud API format)
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return NextResponse.json({ ok: true });

  const from = message.from; // phone number
  const text = message.text?.body?.toLowerCase().trim() ?? '';

  // Simple intent matching — extend as needed
  let reply: string;
  if (text.includes('puntos') || text.includes('cuanto')) {
    const { rows } = await getPool().query(
      `SELECT total_points, tier FROM customer_points WHERE phone = $1`, [from.replace(/^52/, '')]
    );
    reply = rows[0]
      ? `Tienes ${rows[0].total_points} puntos y eres nivel ${rows[0].tier}. 🎉`
      : 'No encontramos tu cuenta. Visítanos para empezar a acumular puntos.';
  } else if (text.includes('premio')) {
    reply = 'Puedes ver tus premios en: https://premia-tierra.vercel.app/mis-premios';
  } else {
    reply = 'Hola! Escribe "puntos" para saber cuántos tienes, o "premios" para ver tus premios disponibles.';
  }

  // Sending the reply requires calling Meta's Cloud API — scaffold the call:
  // await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ messaging_product: 'whatsapp', to: from, text: { body: reply } }),
  // });

  return NextResponse.json({ ok: true, would_reply: reply });
}
