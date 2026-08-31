import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { randomUUID } from 'crypto';

async function ensureMissionsSchema() {
  // Schema is created in lib/db.ts ensureSchema — nothing extra needed here
}

export async function GET(req: NextRequest) {
  await ensureMissionsSchema();
  const pool = getPool();
  const phone = req.nextUrl.searchParams.get('phone');

  if (phone) {
    // Public: get this week's missions + progress for a phone
    const { rows } = await pool.query(
      `SELECT m.*, mp.progress, mp.completed, mp.reward_granted
       FROM weekly_missions m
       LEFT JOIN mission_progress mp ON mp.mission_id = m.id AND mp.phone = $1
       WHERE m.active = true
         AND m.week_start <= CURRENT_DATE
         AND m.week_end >= CURRENT_DATE
       ORDER BY m.created_at`,
      [phone]
    );
    return NextResponse.json({ missions: rows });
  }

  // Admin: all missions
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { rows } = await pool.query(
    `SELECT m.*,
       COUNT(mp.phone)::int AS participants,
       COUNT(mp.phone) FILTER (WHERE mp.completed)::int AS completions
     FROM weekly_missions m
     LEFT JOIN mission_progress mp ON mp.mission_id = m.id
     GROUP BY m.id
     ORDER BY m.week_start DESC, m.created_at DESC`
  );
  return NextResponse.json({ missions: rows });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const body = await req.json() as {
    title: string;
    description: string;
    goal_type: string;
    goal_value: number;
    reward_points: number;
    restaurant_id?: string;
  };

  if (!body.title || !body.goal_value || !body.reward_points) {
    return NextResponse.json({ error: 'Faltan campos requeridos.' }, { status: 400 });
  }

  // Week starts Monday
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon...6=Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO weekly_missions (id, title, description, goal_type, goal_value, reward_points, restaurant_id, week_start, week_end)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      randomUUID(), body.title, body.description,
      body.goal_type ?? 'visits', body.goal_value, body.reward_points,
      body.restaurant_id ?? null,
      weekStart.toISOString().split('T')[0],
      weekEnd.toISOString().split('T')[0],
    ]
  );
  return NextResponse.json({ mission: rows[0] }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const body = await req.json() as {
    id: string;
    title?: string;
    description?: string;
    goal_type?: string;
    goal_value?: number;
    reward_points?: number;
  };

  if (!body.id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

  const pool = getPool();
  const { rows } = await pool.query(
    `UPDATE weekly_missions SET
       title = COALESCE($2, title),
       description = COALESCE($3, description),
       goal_type = COALESCE($4, goal_type),
       goal_value = COALESCE($5, goal_value),
       reward_points = COALESCE($6, reward_points)
     WHERE id = $1
     RETURNING *`,
    [body.id, body.title ?? null, body.description ?? null, body.goal_type ?? null, body.goal_value ?? null, body.reward_points ?? null]
  );

  if (rows.length === 0) return NextResponse.json({ error: 'Misión no encontrada.' }, { status: 404 });
  return NextResponse.json({ mission: rows[0] });
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

  await getPool().query('UPDATE weekly_missions SET active = false WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
}
