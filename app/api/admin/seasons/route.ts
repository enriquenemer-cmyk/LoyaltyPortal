import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const pool = getPool();
  try {
    const { rows: seasons } = await pool.query(
      `SELECT id, name, restaurant_id, start_date, end_date, active, created_at
       FROM seasons ORDER BY created_at DESC`
    );

    const { rows: tiers } = await pool.query(
      `SELECT id, season_id, level, points_required, reward_name, reward_description
       FROM season_tiers ORDER BY season_id, level ASC`
    );

    const seasonsWithTiers = seasons.map((s) => ({
      ...s,
      tiers: tiers.filter((t) => t.season_id === s.id),
    }));

    return NextResponse.json({ seasons: seasonsWithTiers });
  } catch (err) {
    console.error('[/api/admin/seasons GET]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, start_date, end_date, restaurant_id, tiers } = body;

    if (!name || !start_date || !end_date || !Array.isArray(tiers) || tiers.length === 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios.' }, { status: 400 });
    }

    const pool = getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const seasonId = randomUUID();
      const { rows: seasonRows } = await client.query(
        `INSERT INTO seasons (id, name, restaurant_id, start_date, end_date, active)
         VALUES ($1, $2, $3, $4, $5, true) RETURNING *`,
        [seasonId, name, restaurant_id || null, start_date, end_date]
      );

      const insertedTiers = [];
      for (const t of tiers) {
        const { rows: tierRows } = await client.query(
          `INSERT INTO season_tiers (id, season_id, level, points_required, reward_name, reward_description)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [randomUUID(), seasonId, t.level, t.points_required, t.reward_name, t.reward_description || null]
        );
        insertedTiers.push(tierRows[0]);
      }

      await client.query('COMMIT');

      return NextResponse.json({ season: { ...seasonRows[0], tiers: insertedTiers } }, { status: 201 });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[/api/admin/seasons POST]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
