import { NextRequest, NextResponse } from 'next/server';
import {
  logGameStart,
  logGameComplete,
  markGameClaimCompleted,
  getGameAnalytics,
} from '@/lib/db';

// GET /api/game-analytics?restaurantId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurantId') ?? undefined;
  try {
    const data = await getGameAnalytics(restaurantId);
    return NextResponse.json(data);
  } catch (err) {
    console.error('game-analytics GET error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/game-analytics  — action: 'start' | 'complete' | 'claim'
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'start') {
      const { game_type, bundle_id, restaurant_id } = body;
      if (!game_type) return NextResponse.json({ error: 'game_type required' }, { status: 400 });
      const id = crypto.randomUUID();
      const row = await logGameStart({ id, game_type, bundle_id: bundle_id ?? null, restaurant_id: restaurant_id ?? null });
      return NextResponse.json({ session_id: row.id });
    }

    if (action === 'complete') {
      const { session_id, time_spent, prize_won } = body;
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
      await logGameComplete(session_id, { time_spent_ms: time_spent ?? null, prize_won: prize_won ?? null });
      return NextResponse.json({ ok: true });
    }

    if (action === 'claim') {
      const { session_id } = body;
      if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 });
      await markGameClaimCompleted(session_id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('game-analytics POST error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
