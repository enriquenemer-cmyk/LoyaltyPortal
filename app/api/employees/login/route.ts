import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

type EmployeeRow = {
  id: string;
  full_name: string;
  pin_hash: string;
  restaurant_id: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin || typeof pin !== 'string' || !/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'PIN inválido.' }, { status: 400 });
    }

    const pool = getPool();
    const { rows } = await pool.query<EmployeeRow>(
      `SELECT id, full_name, pin_hash, restaurant_id FROM employees WHERE active = TRUE`
    );

    let matched: EmployeeRow | null = null;
    for (const employee of rows) {
      if (await bcrypt.compare(pin, employee.pin_hash)) {
        matched = employee;
        break;
      }
    }

    if (!matched) {
      return NextResponse.json({ error: 'PIN incorrecto.' }, { status: 401 });
    }

    const session = await getEmployeeSession();
    session.employeeId = matched.id;
    session.fullName = matched.full_name;
    session.restaurantId = matched.restaurant_id;
    await session.save();

    return NextResponse.json({
      ok: true,
      employee: { id: matched.id, full_name: matched.full_name },
    });
  } catch (err) {
    console.error('Employee login error:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
