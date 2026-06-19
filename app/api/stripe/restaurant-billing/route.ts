import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 });
  }
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const body = await req.json() as { restaurant_id: string; email: string; plan?: string };
  const { restaurant_id, email, plan = 'pro' } = body;

  const PLAN_PRICES: Record<string, number> = { starter: 29900, pro: 59900, enterprise: 99900 };
  const PLAN_NAMES: Record<string, string> = { starter: 'Super Tierra Starter', pro: 'Super Tierra Pro', enterprise: 'Super Tierra Enterprise' };

  const priceAmount = PLAN_PRICES[plan] ?? 29900;
  const planName = PLAN_NAMES[plan] ?? 'Super Tierra Pro';

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'mxn',
        recurring: { interval: 'month' },
        product_data: { name: planName, description: 'Plataforma de lealtad Super Tierra' },
        unit_amount: priceAmount,
      },
      quantity: 1,
    }],
    metadata: { restaurant_id, plan, type: 'restaurant_billing' },
    success_url: `${appUrl}/admin/billing?success=1`,
    cancel_url: `${appUrl}/admin/billing`,
    customer_email: email,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
