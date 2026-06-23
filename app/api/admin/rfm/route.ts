import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { SessionData, sessionOptions } from '@/lib/session';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export type RfmSegment =
  | 'champions'
  | 'leales'
  | 'nuevos_prometedores'
  | 'en_riesgo'
  | 'perdidos'
  | 'regulares';

export interface RfmCustomer {
  phone: string;
  full_name: string;
  last_visit: string;
  frequency: number;
  days_since: number;
  r_score: number;
  f_score: number;
  segment: RfmSegment;
}

async function requireSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session.username ? session : null;
}

// NOTE: This app does not reliably track a per-customer monetary amount on
// the main `claims` table (the `amount` column lives on the separate
// `ticket_claims` table, used only for a subset of consumption-based flows,
// and is not guaranteed to be populated for every customer/claim). Because
// per-customer monetary data is sparse, this RFM segmentation uses only
// Recency + Frequency (RF), using the customer's claim count as a proxy for
// monetary value (more claims redeemed ~ more value generated for the
// business), as suggested in the task spec.
export async function GET() {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const { rows } = await pool.query<{
      phone: string;
      full_name: string;
      last_visit: string;
      frequency: string;
      days_since: string;
      r_score: number;
      f_score: number;
      segment: RfmSegment;
    }>(`
      WITH customer_stats AS (
        SELECT phone, full_name,
          MAX(claimed_at) as last_visit,
          COUNT(*) as frequency,
          EXTRACT(DAY FROM NOW() - MAX(claimed_at)) as days_since
        FROM claims
        GROUP BY phone, full_name
      ),
      scored AS (
        SELECT *,
          CASE WHEN days_since <= 7 THEN 5 WHEN days_since <= 14 THEN 4
               WHEN days_since <= 30 THEN 3 WHEN days_since <= 60 THEN 2 ELSE 1 END as r_score,
          CASE WHEN frequency >= 10 THEN 5 WHEN frequency >= 6 THEN 4
               WHEN frequency >= 3 THEN 3 WHEN frequency >= 2 THEN 2 ELSE 1 END as f_score
        FROM customer_stats
      )
      SELECT phone, full_name, last_visit::text as last_visit, frequency::text as frequency,
        days_since::text as days_since, r_score, f_score,
        CASE
          WHEN r_score >= 4 AND f_score >= 4 THEN 'champions'
          WHEN r_score >= 3 AND f_score >= 3 THEN 'leales'
          WHEN r_score >= 4 AND f_score <= 2 THEN 'nuevos_prometedores'
          WHEN r_score <= 2 AND f_score >= 3 THEN 'en_riesgo'
          WHEN r_score <= 2 AND f_score <= 2 THEN 'perdidos'
          ELSE 'regulares'
        END as segment
      FROM scored
      ORDER BY r_score DESC, f_score DESC
    `);

    const customers: RfmCustomer[] = rows.map((r) => ({
      phone: r.phone,
      full_name: r.full_name,
      last_visit: r.last_visit,
      frequency: parseInt(r.frequency, 10),
      days_since: Math.round(parseFloat(r.days_since)),
      r_score: r.r_score,
      f_score: r.f_score,
      segment: r.segment,
    }));

    const summary: Record<RfmSegment, number> = {
      champions: 0,
      leales: 0,
      nuevos_prometedores: 0,
      en_riesgo: 0,
      perdidos: 0,
      regulares: 0,
    };
    for (const c of customers) {
      summary[c.segment]++;
    }

    return NextResponse.json({ customers, summary });
  } catch (err) {
    console.error('[/api/admin/rfm]', err);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
