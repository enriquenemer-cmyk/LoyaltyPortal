import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByUsername } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { username, password, restaurant_id } = await request.json();
    if (!username || !password || !restaurant_id) {
      return NextResponse.json({ error: 'Usuario, contraseña y restaurante son obligatorios.' }, { status: 400 });
    }
    const existing = await getUserByUsername(username);
    if (existing) return NextResponse.json({ error: 'El usuario ya existe.' }, { status: 409 });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await createUser({ id: randomUUID(), username, password_hash, role: 'manager', restaurant_id });
    return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } }, { status: 201 });
  } catch (err) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
