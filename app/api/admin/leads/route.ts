import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export const runtime = 'nodejs';

// GET /api/admin/leads — consolida los contactos que la plataforma ha
// capturado, sin importar si reclamaron un premio normal o jugaron un
// juego: cada QR escaneado deja un teléfono/email, y esta lista los junta
// en un solo lugar para seguimiento comercial.
export async function GET() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `WITH contacts AS (
       SELECT phone, full_name, email, claimed_at AS activity_at, 'premio' AS source
       FROM claims
       UNION ALL
       SELECT phone, full_name, email, played_at AS activity_at, 'juego' AS source
       FROM game_plays
     )
     SELECT
       phone,
       (ARRAY_AGG(full_name ORDER BY activity_at DESC))[1] AS full_name,
       (ARRAY_AGG(email ORDER BY activity_at DESC))[1] AS email,
       MIN(activity_at) AS first_seen,
       MAX(activity_at) AS last_seen,
       COUNT(*)::int AS total_interactions,
       COUNT(*) FILTER (WHERE source = 'premio')::int AS prizes_count,
       COUNT(*) FILTER (WHERE source = 'juego')::int AS games_count
     FROM contacts
     WHERE phone IS NOT NULL AND phone != ''
     GROUP BY phone
     ORDER BY last_seen DESC`
  );

  return NextResponse.json({ leads: rows });
}
