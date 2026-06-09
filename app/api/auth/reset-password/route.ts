import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getResetToken, markTokenUsed, updateUserPassword, logActivity } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token requerido.' }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 });
    }

    const record = await getResetToken(token);

    if (!record) {
      return NextResponse.json({ error: 'Token inválido o no encontrado.' }, { status: 400 });
    }

    if (record.used_at) {
      return NextResponse.json({ error: 'Este enlace ya fue utilizado.' }, { status: 400 });
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json({ error: 'El enlace ha expirado. Solicita uno nuevo.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await updateUserPassword(record.username, passwordHash);
    await markTokenUsed(token);

    await logActivity({
      id: crypto.randomUUID(),
      restaurant_id: null,
      action: 'password_reset_completed',
      description: `Contraseña restablecida para: ${record.username}`,
      user_name: record.username,
      metadata: { username: record.username },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('reset-password error', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
