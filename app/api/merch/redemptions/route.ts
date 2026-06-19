import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.username) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT mr.*, mi.name as item_name FROM merch_redemptions mr
     JOIN merch_items mi ON mr.merch_item_id = mi.id
     ORDER BY mr.created_at DESC LIMIT 50`
  );
  return NextResponse.json({ redemptions: rows });
}
