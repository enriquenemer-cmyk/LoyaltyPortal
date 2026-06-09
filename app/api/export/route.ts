import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getAllPrizes, getAllClaims, getAllRestaurants } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Require admin session
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (!session.username) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    const [prizes, claims, restaurants] = await Promise.all([
      getAllPrizes(),
      getAllClaims(),
      getAllRestaurants(),
    ]);

    const backup = {
      exported_at: new Date().toISOString(),
      exported_by: session.username,
      prizes,
      claims,
      restaurants,
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=backup-${date}.json`,
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Error al exportar.' }, { status: 500 });
  }
}
