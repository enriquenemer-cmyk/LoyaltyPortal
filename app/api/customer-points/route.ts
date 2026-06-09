import { NextRequest, NextResponse } from 'next/server';
import { getCustomerPoints, getPool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const contact = req.nextUrl.searchParams.get('contact')?.trim();
  if (!contact) {
    return NextResponse.json({ error: 'contact param required' }, { status: 400 });
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
