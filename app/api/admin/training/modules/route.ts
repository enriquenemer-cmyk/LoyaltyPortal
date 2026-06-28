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
    const [modulesResult, activeEmployeesResult] = await Promise.all([
      pool.query(
        `SELECT
           m.id, m.restaurant_id, m.title, m.description, m.icon, m.active, m.sort_order, m.created_at,
           COUNT(DISTINCT q.id)::int AS question_count,
           COUNT(DISTINCT a.employee_id)::int AS completed_by_count
         FROM training_modules m
         LEFT JOIN training_questions q ON q.module_id = m.id
         LEFT JOIN training_attempts a ON a.module_id = m.id
         GROUP BY m.id
         ORDER BY m.sort_order ASC, m.created_at ASC`
      ),
      pool.query<{ count: string }>(`SELECT COUNT(*) AS count FROM employees WHERE active = TRUE`),
    ]);
    const activeEmployeeCount = Number(activeEmployeesResult.rows[0]?.count ?? 0);
    return NextResponse.json({ modules: modulesResult.rows, activeEmployeeCount });
  } catch (error) {
    console.error('[GET /api/admin/training/modules]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, icon, restaurant_id } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'El título es obligatorio.' }, { status: 400 });
    }

    const pool = getPool();
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO training_modules (id, restaurant_id, title, description, icon, active, sort_order)
       VALUES ($1, $2, $3, $4, $5, TRUE, 0)
       RETURNING id, restaurant_id, title, description, icon, active, sort_order, created_at`,
      [id, restaurant_id || null, title, description || null, icon || '📚']
    );

    return NextResponse.json({ module: { ...result.rows[0], question_count: 0, completed_by_count: 0 } }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/training/modules]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
