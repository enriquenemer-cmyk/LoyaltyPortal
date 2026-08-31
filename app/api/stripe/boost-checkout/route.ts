import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 });
  }
  const body = await req.json() as { token?: string; days?: number; multiplier?: number };
  const { token, days = 7, multiplier = 2 } = body;
  if (!token) return NextResponse.json({ error: 'token requerido.' }, { status: 400 });

  // Resolve phone/email server-side from the customer's own public token —
  // never trust phone/email coming directly from the client for a paid checkout.
  const { rows } = await getPool().query<{ phone: string; email: string | null }>(
    `SELECT phone, email FROM customer_points WHERE public_token = $1`,
    [token]
  );
  if (rows.length === 0) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });
  const { phone, email } = rows[0];

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'mxn',
        product_data: { name: `Boost ${multiplier}× puntos por ${days} días`, description: 'Multiplica tus puntos en 3E' },
        unit_amount: 2900,
      },
      quantity: 1,
    }],
    metadata: { phone, email: email ?? '', days: String(days), multiplier: String(multiplier), type: 'boost' },
    success_url: `${appUrl}/p/${token}?boost_success=1`,
    cancel_url: `${appUrl}/p/${token}`,
    ...(email ? { customer_email: email } : {}),
  });

  return NextResponse.json({ url: session.url });
}
