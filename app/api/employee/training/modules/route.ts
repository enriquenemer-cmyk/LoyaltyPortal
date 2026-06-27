import { NextResponse } from 'next/server';
import { getEmployeeSession } from '@/lib/employee-session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getEmployeeSession();
  if (!session.employeeId) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const pool = getPool();
  try {
    const result = await pool.query(
      `SELECT
         m.id, m.title, m.description, m.icon, m.sort_order,
         COUNT(q.id)::int AS question_count,
         best.score AS best_score,
         best.total_points AS best_total_points,
         best.completed_at AS completed_at
       FROM training_modules m
       LEFT JOIN training_questions q ON q.module_id = m.id
       LEFT JOIN LATERAL (
         SELECT a.score, a.total_points, a.completed_at
         FROM training_attempts a
         WHERE a.module_id = m.id AND a.employee_id = $1
         ORDER BY a.score DESC, a.completed_at DESC
         LIMIT 1
       ) best ON TRUE
       WHERE m.active = TRUE
       GROUP BY m.id, best.score, best.total_points, best.completed_at
       ORDER BY m.sort_order ASC, m.created_at ASC`,
      [session.employeeId]
    );

    const modules = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      icon: row.icon,
      question_count: row.question_count,
      completed: row.completed_at !== null,
      best_score: row.best_score,
      best_total_points: row.best_total_points,
    }));

    return NextResponse.json({ modules });
  } catch (error) {
    console.error('[GET /api/employee/training/modules]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
