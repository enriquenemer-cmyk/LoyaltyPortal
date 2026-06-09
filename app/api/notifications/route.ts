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
