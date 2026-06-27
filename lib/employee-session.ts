import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionOptions } from 'iron-session';

export interface EmployeeSessionData {
  employeeId?: string;
  fullName?: string;
  restaurantId?: string | null;
}

export const employeeSessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'employee_session',
  cookieOptions: { secure: process.env.NODE_ENV === 'production' },
};

/**
 * Reads the current iron-session for the employee clock-in kiosk.
 * Separate cookie/session from the admin session so the two never mix.
 */
export async function getEmployeeSession() {
  const cookieStore = await cookies();
  return getIronSession<EmployeeSessionData>(cookieStore, employeeSessionOptions);
}
