import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { markAllRead } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

export async function PATCH() {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    const restaurantId = session.restaurantId ?? null;
    await markAllRead(restaurantId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
