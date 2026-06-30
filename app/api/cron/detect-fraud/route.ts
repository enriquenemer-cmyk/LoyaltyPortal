import { NextRequest, NextResponse } from 'next/server';
import { getPool, getDayOfWeekAverages } from '@/lib/db';
import { randomUUID } from 'crypto';

// Called daily via cron. CRON_SECRET env var protects this endpoint.
// Rule-based, deterministic fraud detection — no LLM judgment involved.
export async function GET(req: NextRequest) {
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const authorized =
    !process.env.CRON_SECRET ||
    bearer === `Bearer ${process.env.CRON_SECRET}` ||
    secret === process.env.CRON_SECRET;
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pool = getPool();
  let alertsCreated = 0;

  async function alreadyAlerted(type: string, phone: string | null): Promise<boolean> {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM fraud_alerts
       WHERE type = $1 AND resolved = false AND created_at > NOW() - INTERVAL '24 hours'
         AND ((phone IS NULL AND $2::text IS NULL) OR phone = $2)
       LIMIT 1`,
      [type, phone]
    );
    return rows.length > 0;
  }

  async function createAlert(params: {
    type: string;
    severity: string;
    phone: string | null;
    restaurant_id: string | null;
    description: string;
    metadata?: Record<string, unknown> | null;
  }) {
    await pool.query(
      `INSERT INTO fraud_alerts (id, type, severity, phone, restaurant_id, description, metadata, resolved)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
      [
        randomUUID(),
        params.type,
        params.severity,
        params.phone,
        params.restaurant_id,
        params.description,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
    alertsCreated++;
  }

  try {
    // a) Velocity abuse: phone with > 5 claims in the last hour
    const { rows: velocityRows } = await pool.query<{ phone: string; count: string }>(
      `SELECT phone, COUNT(*) as count FROM claims
       WHERE claimed_at > NOW() - INTERVAL '1 hour'
       GROUP BY phone HAVING COUNT(*) > 5`
    );
    for (const row of velocityRows) {
      const type = 'velocity_abuse';
      if (await alreadyAlerted(type, row.phone)) continue;
      await createAlert({
        type,
        severity: 'high',
        phone: row.phone,
        restaurant_id: null,
        description: `Cliente ${row.phone} reclamó ${row.count} premios en la última hora — posible abuso.`,
        metadata: { count: parseInt(row.count, 10) },
      });
    }

    // b) Shared IP, multiple identities: same IP used by > 3 distinct phones in last 24h
    const { rows: sharedIpRows } = await pool.query<{ ip_address: string; phone_count: string }>(
      `SELECT ip_address, COUNT(DISTINCT phone) as phone_count FROM claims
       WHERE claimed_at > NOW() - INTERVAL '24 hours' AND ip_address IS NOT NULL
       GROUP BY ip_address HAVING COUNT(DISTINCT phone) > 3`
    );
    for (const row of sharedIpRows) {
      const type = 'shared_ip';
      // Dedupe by IP stored as "phone" key isn't applicable here (phone is null);
      // dedupe instead via metadata->>'ip_address' within the same type/24h window.
      const { rows: existing } = await pool.query<{ id: string }>(
        `SELECT id FROM fraud_alerts
         WHERE type = $1 AND resolved = false AND created_at > NOW() - INTERVAL '24 hours'
           AND metadata->>'ip_address' = $2
         LIMIT 1`,
        [type, row.ip_address]
      );
      if (existing.length > 0) continue;

      const { rows: phoneRows } = await pool.query<{ phone: string }>(
        `SELECT DISTINCT phone FROM claims
         WHERE claimed_at > NOW() - INTERVAL '24 hours' AND ip_address = $1`,
        [row.ip_address]
      );
      const phones = phoneRows.map(p => p.phone);

      await createAlert({
        type,
        severity: 'medium',
        phone: null,
        restaurant_id: null,
        description: `IP ${row.ip_address} usada por ${row.phone_count} números de teléfono distintos en las últimas 24 horas — posible fraude coordinado.`,
        metadata: { ip_address: row.ip_address, phone_count: parseInt(row.phone_count, 10), phones },
      });
    }

    // c) Anomalous spike vs. restaurant's own history (day-of-week average over past 4 weeks)
    const { rows: restaurants } = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM restaurants`
    );
    const todayDow = new Date().getDay();
    for (const restaurant of restaurants) {
      const { rows: todayCountRows } = await pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM claims c
         JOIN prizes p ON c.prize_id = p.id
         WHERE p.restaurant_id = $1 AND DATE(c.claimed_at) = CURRENT_DATE`,
        [restaurant.id]
      );
      const todayCount = parseInt(todayCountRows[0]?.count ?? '0', 10);
      if (todayCount === 0) continue;

      const averages = await getDayOfWeekAverages(restaurant.id);
      const avgForToday = averages.find(a => a.dow === todayDow)?.avg_count ?? 0;

      if (avgForToday >= 2 && todayCount > avgForToday * 3) {
        const type = 'anomalous_spike';
        const { rows: existing } = await pool.query<{ id: string }>(
          `SELECT id FROM fraud_alerts
           WHERE type = $1 AND resolved = false AND created_at > NOW() - INTERVAL '24 hours'
             AND restaurant_id = $2
           LIMIT 1`,
          [type, restaurant.id]
        );
        if (existing.length > 0) continue;

        await createAlert({
          type,
          severity: 'low',
          phone: null,
          restaurant_id: restaurant.id,
          description: `Sucursal ${restaurant.name} tiene actividad inusualmente alta hoy (${todayCount} vs promedio ${avgForToday.toFixed(1)}).`,
          metadata: { today_count: todayCount, avg_count: avgForToday },
        });
      }
    }

    // d) Same prize claimed suspiciously fast after generation (< 10 seconds, last 24h)
    const { rows: fastClaims } = await pool.query<{
      id: string; phone: string; prize_id: string; restaurant_id: string | null;
    }>(
      `SELECT c.id, c.phone, c.prize_id, p.restaurant_id
       FROM claims c JOIN prizes p ON c.prize_id = p.id
       WHERE c.claimed_at > NOW() - INTERVAL '24 hours'
         AND c.claimed_at - p.created_at < INTERVAL '10 seconds'`
    );
    for (const row of fastClaims) {
      const type = 'bot_claim_speed';
      // Dedupe per claim id (avoid re-alerting the same claim each run)
      const { rows: existing } = await pool.query<{ id: string }>(
        `SELECT id FROM fraud_alerts
         WHERE type = $1 AND metadata->>'claim_id' = $2
         LIMIT 1`,
        [type, row.id]
      );
      if (existing.length > 0) continue;

      await createAlert({
        type,
        severity: 'medium',
        phone: row.phone,
        restaurant_id: row.restaurant_id,
        description: `Cliente ${row.phone} reclamó el premio en menos de 10 segundos desde su generación — posible reclamo automatizado.`,
        metadata: { claim_id: row.id, prize_id: row.prize_id },
      });
    }

    return NextResponse.json({ processed: true, alerts_created: alertsCreated });
  } catch (error) {
    console.error('Error in fraud detection cron:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
