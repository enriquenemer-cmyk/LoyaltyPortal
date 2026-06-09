import { NextRequest, NextResponse } from 'next/server';
import { logActivity, getFeedbackStats } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { claim_id, rating, comment } = await req.json();

    if (!claim_id) {
      return NextResponse.json({ error: 'claim_id is required' }, { status: 400 });
    }
    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'rating must be a number between 1 and 5' }, { status: 400 });
    }

    await logActivity({
      id: randomUUID(),
      restaurant_id: null,
      action: 'feedback',
      description: `Post-delivery feedback received for claim ${claim_id}${rating ? ` — rating: ${rating}/5` : ''}`,
      user_name: null,
      metadata: {
        claim_id,
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment }),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('feedback route error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const stats = await getFeedbackStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('feedback GET error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
