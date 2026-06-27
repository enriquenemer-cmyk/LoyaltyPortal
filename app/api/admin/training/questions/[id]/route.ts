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

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const { question, options, correct_index, points, sort_order } = body;

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (question !== undefined) { fields.push(`question = $${idx++}`); values.push(question); }
    if (options !== undefined) {
      if (!Array.isArray(options) || options.length < 2) {
        return NextResponse.json({ error: 'options debe tener al menos 2 elementos.' }, { status: 400 });
      }
      fields.push(`options = $${idx++}`); values.push(JSON.stringify(options));
    }
    if (correct_index !== undefined) {
      const correctIdx = Number(correct_index);
      if (!Number.isInteger(correctIdx) || correctIdx < 0) {
        return NextResponse.json({ error: 'correct_index inválido.' }, { status: 400 });
      }
      fields.push(`correct_index = $${idx++}`); values.push(correctIdx);
    }
    if (points !== undefined) { fields.push(`points = $${idx++}`); values.push(Number(points) || 10); }
    if (sort_order !== undefined) { fields.push(`sort_order = $${idx++}`); values.push(Number(sort_order) || 0); }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar.' }, { status: 400 });
    }

    values.push(id);
    const pool = getPool();
    const result = await pool.query(
      `UPDATE training_questions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, module_id, question, options, correct_index, points, sort_order`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Pregunta no encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ question: result.rows[0] });
  } catch (error) {
    console.error('[PATCH /api/admin/training/questions/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const pool = getPool();
    const result = await pool.query(`DELETE FROM training_questions WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Pregunta no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/training/questions/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
