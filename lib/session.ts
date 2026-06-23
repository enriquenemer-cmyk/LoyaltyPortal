import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionOptions } from 'iron-session';

export interface SessionData {
  username: string;
  role: 'admin' | 'manager' | 'cajero';
  restaurantId?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'premia-session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
};

/**
 * Reads the current iron-session for use in API routes.
 * Returns the session object even if unauthenticated (session.username will be undefined).
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
