import { NextResponse } from 'next/server';
import { getEmployeeSession } from '@/lib/employee-session';

export const runtime = 'nodejs';

export async function POST() {
  const session = await getEmployeeSession();
  session.destroy();
  return NextResponse.json({ ok: true });
}
