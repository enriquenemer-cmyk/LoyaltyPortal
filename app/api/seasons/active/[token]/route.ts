import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pool = getPool();

  try {
    await ensureSchema();
    const { rows: customerRows } = await pool.query<{ phone: string }>(
      `SELECT phone FROM customer_points WHERE public_token = $1`,
      [token]
    );
    const customer = customerRows[0];
    if (!customer) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });

    const { rows: seasonRows } = await pool.query(
      `SELECT id, name, restaurant_id, start_date, end_date, active
       FROM seasons
       WHERE active = true AND start_date <= NOW() AND end_date >= NOW()
       ORDER BY restaurant_id NULLS LAST LIMIT 1`
    );
    const season = seasonRows[0];
    if (!season) return NextResponse.json(null);

    const { rows: tiers } = await pool.query(
      `SELECT id, level, points_required, reward_name, reward_description
       FROM season_tiers WHERE season_id = $1 ORDER BY level ASC`,
      [season.id]
    );

    const { rows: progressRows } = await pool.query(
      `SELECT season_points, claimed_levels FROM season_progress
       WHERE season_id = $1 AND phone = $2`,
      [season.id, customer.phone]
    );
    const progress = progressRows[0] ?? { season_points: 0, claimed_levels: [] };

    return NextResponse.json({
      season,
      tiers,
      progress: {
        season_points: progress.season_points,
        claimed_levels: progress.claimed_levels,
      },
    });
  } catch (err) {
    console.error('[/api/seasons/active/[token]]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
