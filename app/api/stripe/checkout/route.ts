import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

// VIP plan — set STRIPE_VIP_PRICE_ID in env after creating the product in Stripe dashboard
const VIP_PRICE_ID = process.env.STRIPE_VIP_PRICE_ID ?? '';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado. Agrega STRIPE_SECRET_KEY al entorno.' }, { status: 503 });
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  const body = await req.json() as { phone?: string; email?: string; plan?: string };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price: VIP_PRICE_ID || undefined,
      // Fallback: create inline price if no price ID configured yet
      ...(VIP_PRICE_ID ? {} : {
        price_data: {
          currency: 'mxn',
          recurring: { interval: 'month' },
          product_data: { name: 'Super Tierra VIP', description: 'Puntos dobles, acceso anticipado y premios exclusivos' },
          unit_amount: 9900, // $99 MXN
        },
      }),
      quantity: 1,
    }],
    metadata: {
      phone: body.phone ?? '',
      email: body.email ?? '',
      admin_user: session.username ?? 'public',
    },
    success_url: `${appUrl}/admin/suscripciones?success=1`,
    cancel_url: `${appUrl}/admin/suscripciones?cancelled=1`,
    ...(body.email ? { customer_email: body.email } : {}),
  });

  return NextResponse.json({ url: checkoutSession.url });
}
