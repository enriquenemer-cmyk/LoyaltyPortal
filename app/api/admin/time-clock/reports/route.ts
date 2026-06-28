import { NextResponse } from 'next/server';
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

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const pool = getPool();

  try {
    const now = new Date();
    const weekStart = startOfWeek(now);

    // Leaderboard: total hours this week per employee (only closed entries)
    const leaderboardResult = await pool.query<{
      employee_id: string;
      full_name: string;
      position: string | null;
      total_seconds: string;
    }>(
      `SELECT e.id AS employee_id, e.full_name, e.position,
              COALESCE(SUM(EXTRACT(EPOCH FROM (tce.clock_out - tce.clock_in))), 0) AS total_seconds
       FROM employees e
       JOIN time_clock_entries tce ON tce.employee_id = e.id
       WHERE tce.clock_out IS NOT NULL AND tce.clock_in >= $1
       GROUP BY e.id, e.full_name, e.position
       ORDER BY total_seconds DESC`,
      [weekStart.toISOString()]
    );

    const leaderboard = leaderboardResult.rows.map((r) => ({
      employee_id: r.employee_id,
      full_name: r.full_name,
      position: r.position,
      total_hours: Number(r.total_seconds) / 3600,
    }));

    // Anomalies: shifts > 12h, or open entries with clock_in > 16h ago
    const longShiftsResult = await pool.query<{
      id: string;
      employee_id: string;
      full_name: string;
      clock_in: string;
      clock_out: string;
      duration_seconds: string;
    }>(
      `SELECT tce.id, tce.employee_id, e.full_name, tce.clock_in, tce.clock_out,
              EXTRACT(EPOCH FROM (tce.clock_out - tce.clock_in)) AS duration_seconds
       FROM time_clock_entries tce
       JOIN employees e ON e.id = tce.employee_id
       WHERE tce.clock_out IS NOT NULL
         AND EXTRACT(EPOCH FROM (tce.clock_out - tce.clock_in)) > 43200
       ORDER BY tce.clock_in DESC
       LIMIT 20`
    );

    const sixteenHoursAgo = new Date(now.getTime() - 16 * 60 * 60 * 1000);
    const openTooLongResult = await pool.query<{
      id: string;
      employee_id: string;
      full_name: string;
      clock_in: string;
    }>(
      `SELECT tce.id, tce.employee_id, e.full_name, tce.clock_in
       FROM time_clock_entries tce
       JOIN employees e ON e.id = tce.employee_id
       WHERE tce.clock_out IS NULL AND tce.clock_in <= $1
       ORDER BY tce.clock_in ASC
       LIMIT 20`,
      [sixteenHoursAgo.toISOString()]
    );

    const anomalies = [
      ...longShiftsResult.rows.map((r) => ({
        id: r.id,
        type: 'long_shift' as const,
        employee_id: r.employee_id,
        full_name: r.full_name,
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        hours: Number(r.duration_seconds) / 3600,
      })),
      ...openTooLongResult.rows.map((r) => ({
        id: r.id,
        type: 'forgotten_clock_out' as const,
        employee_id: r.employee_id,
        full_name: r.full_name,
        clock_in: r.clock_in,
        clock_out: null,
        hours: (now.getTime() - new Date(r.clock_in).getTime()) / 1000 / 3600,
      })),
    ];

    // Aggregate hours per weekday (Mon-Sun), all closed entries
    const weekdayResult = await pool.query<{ dow: number; total_seconds: string }>(
      `SELECT EXTRACT(DOW FROM tce.clock_in)::int AS dow,
              COALESCE(SUM(EXTRACT(EPOCH FROM (tce.clock_out - tce.clock_in))), 0) AS total_seconds
       FROM time_clock_entries tce
       WHERE tce.clock_out IS NOT NULL
       GROUP BY dow`
    );

    // Map Postgres DOW (0=Sun..6=Sat) to Mon..Sun order
    const hoursByDow = new Map<number, number>();
    for (const row of weekdayResult.rows) {
      hoursByDow.set(row.dow, Number(row.total_seconds) / 3600);
    }
    const weekdayHours = WEEKDAY_LABELS.map((label, i) => {
      const pgDow = (i + 1) % 7; // Mon(0)->1, ... Sun(6)->0
      return { label, value: hoursByDow.get(pgDow) ?? 0 };
    });

    return NextResponse.json({ leaderboard, anomalies, weekdayHours });
  } catch (error) {
    console.error('[GET /api/admin/time-clock/reports]', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
