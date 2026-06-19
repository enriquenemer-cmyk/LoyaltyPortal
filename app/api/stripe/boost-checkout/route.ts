import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 });
  }
  const body = await req.json() as { phone: string; email?: string; days?: number; multiplier?: number };
  const { phone, email, days = 7, multiplier = 2 } = body;
  if (!phone) return NextResponse.json({ error: 'phone requerido.' }, { status: 400 });

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'mxn',
        product_data: { name: `Boost ${multiplier}× puntos por ${days} días`, description: 'Multiplica tus puntos en Super Tierra' },
        unit_amount: 2900,
      },
      quantity: 1,
    }],
    metadata: { phone, email: email ?? '', days: String(days), multiplier: String(multiplier), type: 'boost' },
    success_url: `${appUrl}/cajero?boost_success=1`,
    cancel_url: `${appUrl}/cajero`,
    ...(email ? { customer_email: email } : {}),
  });

  return NextResponse.json({ url: session.url });
}
