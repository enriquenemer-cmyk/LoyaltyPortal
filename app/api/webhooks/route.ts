import { NextRequest, NextResponse } from 'next/server';

export const WEBHOOK_EVENTS = [
  {
    event: 'prize.generated',
    description: 'Se genera un nuevo premio QR',
    payload_example: { prize_id: 'uuid', prize_name: 'Burrito gratis', restaurant_id: 'uuid', generated_at: '2026-01-01T00:00:00Z' },
  },
  {
    event: 'claim.registered',
    description: 'Un cliente registra un premio',
    payload_example: { claim_id: 'uuid', prize_id: 'uuid', prize_name: 'Burrito gratis', full_name: 'Juan García', phone: '5512345678', email: 'juan@ejemplo.com', location: 'Sucursal Centro', claimed_at: '2026-01-01T00:00:00Z' },
  },
  {
    event: 'claim.delivered',
    description: 'El cajero marca un premio como entregado',
    payload_example: { claim_id: 'uuid', prize_id: 'uuid', full_name: 'Juan García', delivered_at: '2026-01-01T00:00:00Z', cashier: 'cajero@tierra.mx' },
  },
];

export async function GET() {
  return NextResponse.json({
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/webhooks`,
    events: WEBHOOK_EVENTS,
    instructions: 'Configure WEBHOOK_URL env var with your Zapier/Make/n8n webhook endpoint. On each event, a POST will be sent with { event, data, timestamp }.',
  });
}

export async function POST(request: NextRequest) {
  // Internal trigger endpoint: POST /api/webhooks with { event, data }
  const body = await request.json().catch(() => null);
  if (!body?.event || !body?.data) {
    return NextResponse.json({ error: 'event and data required' }, { status: 400 });
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ sent: false, reason: 'WEBHOOK_URL not configured' });
  }

  const payload = {
    event: body.event,
    data: body.data,
    timestamp: new Date().toISOString(),
    source: 'supertierra',
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ sent: true, status: res.status });
  } catch (err) {
    console.error('[webhook] delivery failed:', err);
    return NextResponse.json({ sent: false, reason: 'delivery failed' }, { status: 502 });
  }
}
