import { SessionOptions } from 'iron-session';

export interface SessionData {
  username: string;
  role: 'admin' | 'manager';
  restaurantId?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'premia-session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
};
