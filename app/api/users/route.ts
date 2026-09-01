import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByUsername, logActivity } from '@/lib/db';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';

let pool: Pool;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

async function ensureAllowedSections() {
  await getPool().query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_sections TEXT[] DEFAULT NULL
  `);
}

export async function GET() {
  try {
    const session = await getSession();
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }
    await ensureAllowedSections();
    const { rows } = await getPool().query(`
      SELECT u.id, u.username, u.role, u.restaurant_id, u.created_at, u.allowed_sections, r.name AS restaurant_name
      FROM users u
      LEFT JOIN restaurants r ON r.id = u.restaurant_id
      ORDER BY u.created_at DESC
    `);
    return NextResponse.json({ users: rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 403 });
    }
    const { username, password, restaurant_id, role, allowed_sections } = await request.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña son obligatorios.' }, { status: 400 });
    }
    const existing = await getUserByUsername(username);
    if (existing) return NextResponse.json({ error: 'El usuario ya existe.' }, { status: 409 });

    await ensureAllowedSections();
    const password_hash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    const sections = Array.isArray(allowed_sections) && allowed_sections.length > 0 ? allowed_sections : null;
    await getPool().query(
      `INSERT INTO users (id, username, password_hash, role, restaurant_id, allowed_sections)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, username, password_hash, role || 'manager', restaurant_id || null, sections]
    );
    const user = { id, username, role: role || 'manager' };

    await logActivity({
      id: randomUUID(),
      restaurant_id: restaurant_id || null,
      action: 'user_created',
      description: `Usuario creado: ${username} (${role || 'manager'})`,
      user_name: session.username ?? 'Sistema',
      metadata: { user_id: user.id, role: user.role },
    }).catch(() => {});

    return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } }, { status: 201 });
  } catch (err) {
    console.error('Error creating user:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
