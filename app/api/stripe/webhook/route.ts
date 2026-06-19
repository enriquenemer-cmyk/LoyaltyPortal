import { NextRequest, NextResponse } from 'next/server';
import { getPool, upsertCustomerPoints, logActivity } from '@/lib/db';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe no configurado.' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(body, sig, webhookSecret)
      : JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { metadata?: { phone?: string; email?: string; type?: string; days?: string; multiplier?: string } };
    const phone = session.metadata?.phone;
    const email = session.metadata?.email;
    const sessionType = session.metadata?.type;

    if (phone && sessionType === 'boost') {
      const days = parseInt(session.metadata?.days ?? '7');
      const multiplier = parseFloat(session.metadata?.multiplier ?? '2');
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      await getPool().query(
        `UPDATE customer_points SET point_multiplier = $1, boost_expires_at = $2, updated_at = NOW() WHERE phone = $3`,
        [multiplier, expiresAt, phone]
      );
      logActivity({ id: randomUUID(), restaurant_id: null, action: 'boost_activated',
        description: `Boost ${multiplier}× activado para ${phone} (${days} días)`,
        user_name: 'Stripe', metadata: { phone, multiplier, days } }).catch(() => {});
    }

    if (phone && email && sessionType !== 'boost') {
      // Mark customer as VIP in customer_points
      await getPool().query(
        `INSERT INTO customer_points (id, phone, email, total_points, lifetime_points, tier, updated_at)
         VALUES ($1,$2,$3,300,300,'gold',NOW())
         ON CONFLICT (phone) DO UPDATE SET tier = 'gold', updated_at = NOW()`,
        [randomUUID(), phone, email]
      );

      logActivity({
        id: randomUUID(),
        restaurant_id: null,
        action: 'vip_subscription_activated',
        description: `Suscripción VIP activada para ${phone}`,
        user_name: 'Stripe',
        metadata: { phone, email },
      }).catch(() => {});
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as { metadata?: { phone?: string } };
    const phone = sub.metadata?.phone;
    if (phone) {
      // Downgrade from gold if they were VIP-only gold
      await getPool().query(
        `UPDATE customer_points SET tier = CASE WHEN total_points >= 300 THEN 'gold' WHEN total_points >= 100 THEN 'silver' ELSE 'bronze' END WHERE phone = $1`,
        [phone]
      );
    }
  }

  return NextResponse.json({ received: true });
}
