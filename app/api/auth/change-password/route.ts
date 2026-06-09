import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getUserByUsername } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

let pool: Pool;
function getPool(): Pool {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (!session.username) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
    }

    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Todos los campos son requeridos.' }, { status: 400 });
    }

    if (new_password.length < 8) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' }, { status: 400 });
    }

    // Admin account (env-based)
    if (session.role === 'admin') {
      const envUser = (process.env.ADMIN_USER ?? '').trim();
      const envPass = (process.env.ADMIN_PASSWORD ?? '').trim();

      if (session.username === envUser) {
        if (current_password.trim() !== envPass) {
          return NextResponse.json({ error: 'Contraseña actual incorrecta.' }, { status: 400 });
        }
        // For env-based admin, we can't change the env var at runtime.
        return NextResponse.json({
          ok: false,
          message: 'Tu cuenta de admin está configurada por variables de entorno. Para cambiar la contraseña, actualiza la variable ADMIN_PASSWORD en tu proveedor de hosting (Vercel) y redespliega.',
        });
      }
    }

    // DB user (manager)
    const user = await getUserByUsername(session.username);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Contraseña actual incorrecta.' }, { status: 400 });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await getPool().query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, user.id]);

    return NextResponse.json({ ok: true, message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
