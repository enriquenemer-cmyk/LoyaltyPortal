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

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { module_id, question, options, correct_index, points } = body;

    if (!module_id || !question || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'module_id, question y options (mínimo 2) son obligatorios.' }, { status: 400 });
    }

    const correctIdx = Number(correct_index);
    if (!Number.isInteger(correctIdx) || correctIdx < 0 || correctIdx >= options.length) {
      return NextResponse.json({ error: 'correct_index inválido.' }, { status: 400 });
    }

    const pool = getPool();
    const id = randomUUID();

    const sortResult = await pool.query(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort FROM training_questions WHERE module_id = $1`,
      [module_id]
    );
    const nextSort = sortResult.rows[0]?.next_sort ?? 0;

    const result = await pool.query(
      `INSERT INTO training_questions (id, module_id, question, options, correct_index, points, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, module_id, question, options, correct_index, points, sort_order`,
      [id, module_id, question, JSON.stringify(options), correctIdx, Number(points) || 10, nextSort]
    );

    return NextResponse.json({ question: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/training/questions]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
