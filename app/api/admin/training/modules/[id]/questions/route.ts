import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT id, module_id, question, options, correct_index, points, sort_order
       FROM training_questions
       WHERE module_id = $1
       ORDER BY sort_order ASC`,
      [id]
    );
    return NextResponse.json({ questions: result.rows });
  } catch (error) {
    console.error('[GET /api/admin/training/modules/[id]/questions]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
