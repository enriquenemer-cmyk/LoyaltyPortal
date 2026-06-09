import { getPool } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows } = await getPool().query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM claims WHERE claimed_at >= NOW() - INTERVAL '7 days'`
    );
    const count = parseInt(rows[0]?.count ?? '0', 10);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
