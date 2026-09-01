import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { createNotification, getUnreadNotifications, NotificationType } from '@/lib/db';
import { SessionData, sessionOptions } from '@/lib/session';

async function getRestaurantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    return session.restaurantId ?? null;
  } catch {
    return null;
  }
}

// Autorizado por sesión de admin (uso manual desde el panel) o por el
// CRON_SECRET compartido (llamadas server-to-server, ej. el anuncio de
// actualizaciones de la plataforma) — antes este endpoint no verificaba
// nada y cualquiera en internet podía crear notificaciones falsas.
async function isAuthorized(req: NextRequest): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    if (session.username) return true;
  } catch {
    // ignore
  }
  if (!process.env.CRON_SECRET) return false;
  const internalSecret = req.headers.get('x-internal-secret');
  return internalSecret === process.env.CRON_SECRET;
}

export async function GET() {
  try {
    const restaurantId = await getRestaurantId();
    const notifications = await getUnreadNotifications(restaurantId);
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { type, title, body: bodyText, link, restaurant_id } = body;

    if (!type || !title || !bodyText) {
      return NextResponse.json({ error: 'type, title y body son requeridos.' }, { status: 400 });
    }

    const notification = await createNotification({
      type: type as NotificationType,
      title,
      body: bodyText,
      link: link ?? null,
      restaurant_id: restaurant_id ?? null,
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
