import { NextResponse } from 'next/server';
import {
  getAllGameBundles,
  insertGameBundle,
  insertGamePrize,
  getGamePrizesForBundle,
} from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const bundles = await getAllGameBundles();
    // Attach prizes for each bundle
    const result = await Promise.all(
      bundles.map(async (b) => ({
        ...b,
        prizes: await getGamePrizesForBundle(b.id),
      }))
    );
    return NextResponse.json({ bundles: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error fetching bundles' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { name, game_type, restaurant_id, prizes } = body as {
      name: string;
      game_type: string;
      restaurant_id?: string;
      prizes: Array<{ name: string; description: string; probability: number; max_winners?: number }>;
    };

    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!prizes || prizes.length < 2 || prizes.length > 8) {
      return NextResponse.json({ error: 'Must have 2–8 prizes' }, { status: 400 });
    }
    const total = prizes.reduce((s, p) => s + (p.probability ?? 0), 0);
    if (total !== 100) {
      return NextResponse.json({ error: `Probabilities must sum to 100 (got ${total})` }, { status: 400 });
    }

    const bundle = await insertGameBundle({
      id: crypto.randomUUID(),
      name: name.trim(),
      game_type: (game_type as 'roulette' | 'slots' | 'penalty' | 'scratch') || 'roulette',
      restaurant_id: restaurant_id || null,
      active: true,
    });

    const createdPrizes = await Promise.all(
      prizes.map((p, i) =>
        insertGamePrize({
          id: crypto.randomUUID(),
          bundle_id: bundle.id,
          name: p.name,
          description: p.description,
          probability: p.probability,
          max_winners: p.max_winners ?? null,
          sort_order: i,
        })
      )
    );

    return NextResponse.json({ bundle, prizes: createdPrizes }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error creating bundle' }, { status: 500 });
  }
}
