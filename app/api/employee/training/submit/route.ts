import { NextRequest, NextResponse } from 'next/server';
import { getEmployeeSession } from '@/lib/employee-session';
import { getPool } from '@/lib/db';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

type QuestionRow = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  points: number;
  sort_order: number;
};

export async function POST(request: NextRequest) {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { module_id, answers } = body;

    if (!module_id || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'module_id y answers son obligatorios.' }, { status: 400 });
    }

    const pool = getPool();

    const moduleResult = await pool.query(
      `SELECT id FROM training_modules WHERE id = $1 AND active = TRUE`,
      [module_id]
    );
    if (moduleResult.rows.length === 0) {
      return NextResponse.json({ error: 'Módulo no encontrado.' }, { status: 404 });
    }

    const questionsResult = await pool.query<QuestionRow>(
      `SELECT id, question, options, correct_index, points, sort_order
       FROM training_questions
       WHERE module_id = $1
       ORDER BY sort_order ASC`,
      [module_id]
    );

    const questions = questionsResult.rows;
    if (questions.length === 0) {
      return NextResponse.json({ error: 'El módulo no tiene preguntas.' }, { status: 400 });
    }

    let score = 0;
    let totalPoints = 0;
    let maxPossiblePoints = 0;

    const detail = questions.map((q, idx) => {
      const chosenIndex = typeof answers[idx] === 'number' ? answers[idx] : -1;
      const correct = chosenIndex === q.correct_index;
      maxPossiblePoints += q.points;
      if (correct) {
        score += 1;
        totalPoints += q.points;
      }
      return {
        question_id: q.id,
        question: q.question,
        options: q.options,
        chosen_index: chosenIndex,
        correct_index: q.correct_index,
        correct,
        points: correct ? q.points : 0,
      };
    });

    const attemptId = randomUUID();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO training_attempts (id, employee_id, module_id, score, total_points)
         VALUES ($1, $2, $3, $4, $5)`,
        [attemptId, session.employeeId, module_id, score, totalPoints]
      );
      await client.query(
        `UPDATE employees SET total_training_points = total_training_points + $1 WHERE id = $2`,
        [totalPoints, session.employeeId]
      );
      const employeeResult = await client.query(
        `SELECT total_training_points FROM employees WHERE id = $1`,
        [session.employeeId]
      );
      await client.query('COMMIT');

      return NextResponse.json({
        attempt: {
          id: attemptId,
          score,
          total_points: totalPoints,
          max_possible_points: maxPossiblePoints,
          question_count: questions.length,
        },
        detail,
        employee_total_points: employeeResult.rows[0]?.total_training_points ?? null,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[POST /api/employee/training/submit]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
