import { getPool } from '@/lib/db';
import { createHmac } from 'crypto';

export async function dispatchWebhook(event: string, data: Record<string, unknown>) {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT * FROM outgoing_webhooks WHERE active = TRUE AND $1 = ANY(events)`,
      [event]
    );
    if (rows.length === 0) return;

    const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data });

    await Promise.all(rows.map(async (wh) => {
      const sig = wh.secret ? createHmac('sha256', wh.secret).update(payload).digest('hex') : null;
      try {
        await fetch(wh.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(sig ? { 'X-ST-Signature': sig } : {}) },
          body: payload,
        });
        await pool.query('UPDATE outgoing_webhooks SET last_triggered_at = NOW() WHERE id = $1', [wh.id]);
      } catch { /* fail silently */ }
    }));
  } catch { /* fail silently */ }
}
