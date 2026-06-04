import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getUserByUsername } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos.' }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    const session = await getIronSession<SessionData>(request, res, sessionOptions);

    // Check env admin
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
      session.username = username;
      session.role = 'admin';
      await session.save();
      return res;
    }

    // Check DB managers
    const user = await getUserByUsername(username);
    if (user && await bcrypt.compare(password, user.password_hash)) {
      session.username = user.username;
      session.role = user.role as 'admin' | 'manager';
      session.restaurantId = user.restaurant_id ?? undefined;
      await session.save();
      return res;
    }

    return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 401 });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
