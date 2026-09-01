import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

async function ensureEmployeeCols() {
  const pool = getPool();
  const cols = [
    `ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_days TEXT DEFAULT 'lun,mar,mie,jue,vie'`,
    `ALTER TABLE employees ADD COLUMN IF NOT EXISTS vacation_days_per_year INTEGER DEFAULT 12`,
    `ALTER TABLE employees ADD COLUMN IF NOT EXISTS vacation_days_used NUMERIC(5,1) DEFAULT 0`,
  ];
  for (const sql of cols) await pool.query(sql).catch(() => {});
}

export async function GET() {
  const session = await getEmployeeSession();
  if (!session.employeeId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  await ensureEmployeeCols();
  const pool = getPool();
  const eid = session.employeeId;

  // Employee base info
  const { rows: empRows } = await pool.query(
    `SELECT id, full_name, position, photo_url,
            scheduled_hours_per_day, scheduled_start_time,
            work_days, vacation_days_per_year, vacation_days_used,
            hourly_rate, created_at
     FROM employees WHERE id = $1`,
    [eid]
  );
  if (!empRows.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
  const emp = empRows[0];

  // Last 14 days clock history
  const { rows: histRows } = await pool.query(
    `SELECT
       id, clock_in, clock_out,
       EXTRACT(EPOCH FROM (COALESCE(clock_out, NOW()) - clock_in)) / 3600 AS hours_worked
     FROM time_clock_entries
     WHERE employee_id = $1
     ORDER BY clock_in DESC
     LIMIT 14`,
    [eid]
  );

  // This week total hours
  const { rows: weekRows } = await pool.query(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(clock_out, NOW()) - clock_in)) / 3600), 0)::numeric(6,2) AS week_hours
     FROM time_clock_entries
     WHERE employee_id = $1
       AND clock_in >= date_trunc('week', NOW())`,
    [eid]
  );

  // This month total hours
  const { rows: monthRows } = await pool.query(
    `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(clock_out, NOW()) - clock_in)) / 3600), 0)::numeric(6,2) AS month_hours
     FROM time_clock_entries
     WHERE employee_id = $1
       AND clock_in >= date_trunc('month', NOW())`,
    [eid]
  );

  // Open entry (active shift)
  const { rows: openRows } = await pool.query(
    `SELECT id, clock_in FROM time_clock_entries WHERE employee_id = $1 AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1`,
    [eid]
  );

  // Employee notifications (from notifications table scoped to restaurant, or all-staff)
  const { rows: notifRows } = await pool.query(
    `SELECT id, type, title, body, link, created_at, read_at
     FROM notifications
     WHERE restaurant_id = (SELECT restaurant_id FROM employees WHERE id = $1)
       AND (target_role IS NULL OR target_role = 'employee')
     ORDER BY created_at DESC
     LIMIT 20`,
    [eid]
  ).catch(() => ({ rows: [] }));

  // Days employed (for vacation accrual: 1 day per month)
  const monthsEmployed = Math.floor(
    (Date.now() - new Date(emp.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const vacationAccrued = Math.min(monthsEmployed, emp.vacation_days_per_year ?? 12);
  const vacationAvailable = Math.max(0, vacationAccrued - (parseFloat(emp.vacation_days_used) || 0));

  return NextResponse.json({
    employee: emp,
    openEntry: openRows[0] ?? null,
    history: histRows,
    weekHours: parseFloat(weekRows[0]?.week_hours ?? '0'),
    monthHours: parseFloat(monthRows[0]?.month_hours ?? '0'),
    vacationAccrued,
    vacationAvailable,
    notifications: notifRows,
  });
}
