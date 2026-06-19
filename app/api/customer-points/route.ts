import { NextRequest, NextResponse } from 'next/server';
import { getAllCustomerPoints, getCustomerPoints, getPool } from '@/lib/db';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const contact = req.nextUrl.searchParams.get('contact')?.trim();
  if (!contact) {
    const points = await getAllCustomerPoints();
    return NextResponse.json({ points });
  }

  try {
    // Try phone lookup first
    let points = await getCustomerPoints(contact);
    if (!points) {
      // Try by email
      const { rows } = await getPool().query(
        `SELECT * FROM customer_points WHERE email = $1 LIMIT 1`,
        [contact]
      );
      points = rows[0] ?? null;
    }
    return NextResponse.json({ points: points ?? null });
  } catch (err) {
    console.error('customer-points GET error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
