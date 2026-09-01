import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getUserByUsername, getPool } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  // Rate limit: max 10 attempts per 5 minutes per IP.
  const ip = getClientIp(request);
  if (!await checkRateLimit(`admin_login_${ip}`, 10, 5 * 60 * 1000)) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }, { status: 429 });
  }

  try {
    const { username, password, rememberMe } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos.' }, { status: 400 });
    }

    let sessionUsername: string | null = null;
    let sessionRole: 'admin' | 'manager' | 'cajero' = 'admin';
    let sessionRestaurantId: string | undefined;

    // 1. Check env-level admin
    const envUser = (process.env.ADMIN_USER ?? '').trim();
    const envPass = (process.env.ADMIN_PASSWORD ?? '').trim();

    if (envUser && envPass && username.trim() === envUser && password.trim() === envPass) {
      sessionUsername = username.trim();
      sessionRole = 'admin';
    } else {
      // 2. Check DB users
      const user = await getUserByUsername(username.trim());
      if (user && await bcrypt.compare(password, user.password_hash)) {
        // Check if restaurant license is active
        if (user.restaurant_id) {
          const { rows: [rest] } = await getPool().query(
            `SELECT billing_status FROM restaurants WHERE id=$1`, [user.restaurant_id]
          );
          if (rest?.billing_status === 'blocked') {
            return NextResponse.json({
              error: 'CUENTA_SUSPENDIDA',
              message: 'Tu cuenta está suspendida. Contacta a 3E para reactivarla.',
            }, { status: 403 });
          }
        }
        sessionUsername = user.username;
        sessionRole = user.role as 'admin' | 'manager' | 'cajero';
        sessionRestaurantId = user.restaurant_id ?? undefined;
      }
    }

    if (!sessionUsername) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 401 });
    }

    // Save session with App Router cookies() API
    const cookieStore = await cookies();
    const opts = rememberMe
      ? { ...sessionOptions, cookieOptions: { ...(sessionOptions.cookieOptions ?? {}), maxAge: 30 * 24 * 60 * 60 } }
      : sessionOptions;
    const session = await getIronSession<SessionData>(cookieStore, opts);
    session.username = sessionUsername;
    session.role = sessionRole;
    if (sessionRestaurantId) session.restaurantId = sessionRestaurantId;
    await session.save();

    // Log admin login activity
    try {
      const { logActivity } = await import('@/lib/db');
      const { randomUUID } = await import('crypto');
      await logActivity({
        id: randomUUID(),
        restaurant_id: null,
        action: 'admin_login',
        description: `Inicio de sesión: ${sessionUsername}`,
        user_name: sessionUsername,
        metadata: { role: sessionRole },
      });
    } catch { /* non-blocking */ }

    return NextResponse.json({
      ok: true,
      user: { username: sessionUsername, role: sessionRole },
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
