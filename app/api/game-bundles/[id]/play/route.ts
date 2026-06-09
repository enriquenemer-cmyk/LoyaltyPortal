import { NextResponse } from 'next/server';
import {
  getGameBundleById,
  getGamePrizesForBundle,
  insertGamePlay,
  incrementWinnersCount,
  GamePrize,
} from '@/lib/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bundle = await getGameBundleById(id);
    if (!bundle) return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    if (!bundle.active) return NextResponse.json({ error: 'This game is no longer active' }, { status: 410 });

    const prizes = await getGamePrizesForBundle(id);
    if (!prizes.length) return NextResponse.json({ error: 'No prizes configured' }, { status: 500 });

    const body = await req.json();
    const { full_name, phone, email, location, pre_selected_prize_id } = body as {
      full_name?: string;
      phone?: string;
      email?: string;
      location?: string;
      pre_selected_prize_id?: string;
    };

    // If a pre-selected prize id is passed (from client-side roll), just record it
    // Otherwise do the random selection here
    let selected: GamePrize | undefined;

    if (pre_selected_prize_id) {
      selected = prizes.find((p) => p.id === pre_selected_prize_id);
    }

    if (!selected) {
      // Weighted random selection
      const roll = Math.random() * 100;
      let cumulative = 0;
      for (const prize of prizes) {
        cumulative += prize.probability;
        if (roll <= cumulative) {
          selected = prize;
          break;
        }
      }
      // Fallback to last prize
      if (!selected) selected = prizes[prizes.length - 1];
    }

    // Check max_winners cap — skip to next if capped
    const orderedPrizes = [...prizes];
    const startIdx = orderedPrizes.findIndex((p) => p.id === selected!.id);
    for (let offset = 0; offset < orderedPrizes.length; offset++) {
      const candidate = orderedPrizes[(startIdx + offset) % orderedPrizes.length];
      if (!candidate.max_winners || candidate.winners_count < candidate.max_winners) {
        selected = candidate;
        break;
      }
    }

    // If player data provided, record the play
    if (full_name && phone && email) {
      await insertGamePlay({
        id: crypto.randomUUID(),
        bundle_id: id,
        game_prize_id: selected.id,
        full_name,
        phone,
        email,
        location: location ?? null,
      });
      await incrementWinnersCount(selected.id);
    }

    return NextResponse.json({
      game_prize_id: selected.id,
      prize_name: selected.name,
      prize_description: selected.description,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error processing play' }, { status: 500 });
  }
}
