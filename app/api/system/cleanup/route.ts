import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action } = body;
  const pool = getPool();

  if (action === 'old_notifications') {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days'`
      );
      return NextResponse.json({ ok: true, deleted: rowCount ?? 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Table may not exist yet — treat gracefully
      if (msg.includes('does not exist')) {
        return NextResponse.json({ ok: true, deleted: 0, note: 'notifications table does not exist' });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (action === 'expired_tokens') {
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM password_reset_tokens WHERE expires_at < NOW()`
      );
      return NextResponse.json({ ok: true, deleted: rowCount ?? 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('does not exist')) {
        return NextResponse.json({ ok: true, deleted: 0, note: 'password_reset_tokens table does not exist' });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (action === 'compact_logs') {
    try {
      // Keep only the most recent 1000 rows; delete the rest
      const { rowCount } = await pool.query(
        `DELETE FROM activity_log
         WHERE id NOT IN (
           SELECT id FROM activity_log ORDER BY created_at DESC LIMIT 1000
         )`
      );
      return NextResponse.json({ ok: true, deleted: rowCount ?? 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
