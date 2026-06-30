import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureSchema } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await ensureSchema();
  const pool = getPool();

  const { rows: cpRows } = await pool.query(
    `SELECT phone FROM customer_points WHERE public_token = $1`,
    [token]
  );
  if (!cpRows[0]) {
    return NextResponse.json({ card: null }, { status: 404 });
  }

  const { rows } = await pool.query(
    `SELECT image_url, prompt_used, created_at FROM ai_customer_cards
     WHERE phone = $1 ORDER BY created_at DESC LIMIT 1`,
    [cpRows[0].phone]
  );

  return NextResponse.json({ card: rows[0] ?? null });
}
