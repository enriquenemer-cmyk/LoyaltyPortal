import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeSession } from '@/lib/employee-session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { id } = await params;
  const pool = getPool();
  try {
    const moduleResult = await pool.query(
      `SELECT id, title, description, icon FROM training_modules WHERE id = $1 AND active = TRUE`,
      [id]
    );
    if (moduleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Módulo no encontrado.' }, { status: 404 });
    }

    // IMPORTANTE: nunca incluir correct_index en la respuesta al empleado.
    const questionsResult = await pool.query(
      `SELECT id, question, options, points, sort_order
       FROM training_questions
       WHERE module_id = $1
       ORDER BY sort_order ASC`,
      [id]
    );

    return NextResponse.json({
      module: moduleResult.rows[0],
      questions: questionsResult.rows,
    });
  } catch (error) {
    console.error('[GET /api/employee/training/modules/[id]]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
