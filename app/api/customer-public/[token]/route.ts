import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const pool = getPool();

  const { rows } = await pool.query(
    `SELECT phone, email, full_name, total_points, lifetime_points, tier,
            streak_days, streak_last_visit, point_multiplier, boost_expires_at, updated_at
     FROM customer_points WHERE public_token = $1`,
    [token]
  );
  if (!rows[0]) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 });

  const cp = rows[0];

  const { rows: claims } = await pool.query(
    `SELECT c.id, p.name as prize_name, c.status, c.claimed_at, c.delivered_at
     FROM claims c JOIN prizes p ON c.prize_id = p.id
     WHERE c.phone = $1 ORDER BY c.claimed_at DESC LIMIT 20`,
    [cp.phone]
  );

  const { rows: stamps } = await pool.query(
    `SELECT stamps_count, stamps_required, completed_at FROM stamp_cards
     WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
    [cp.phone]
  );

  return NextResponse.json({
    profile: {
      full_name: cp.full_name,
      tier: cp.tier,
      total_points: cp.total_points,
      lifetime_points: cp.lifetime_points,
      streak_days: cp.streak_days,
      point_multiplier: Number(cp.point_multiplier),
      boost_active: cp.boost_expires_at && new Date(cp.boost_expires_at) > new Date(),
      boost_expires_at: cp.boost_expires_at,
      updated_at: cp.updated_at,
    },
    claims,
    stamp_card: stamps[0] ?? null,
  });
}
