import { NextRequest, NextResponse } from 'next/server';
import { deliverClaim, getClaimById, logActivity } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const delivered_by = body.delivered_by?.trim() || 'Cajero';

    const existing = await getClaimById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Cobro no encontrado.' }, { status: 404 });
    }
    if (existing.status === 'delivered') {
      return NextResponse.json({ error: 'Este premio ya fue entregado.', claim: existing }, { status: 409 });
    }

    const claim = await deliverClaim(id, delivered_by);
    if (!claim) {
      return NextResponse.json({ error: 'No se pudo marcar como entregado.' }, { status: 500 });
    }

    // Log activity (non-blocking)
    const fullClaim = await getClaimById(id);
    if (fullClaim) {
      // We need restaurant_id — fetch from prize
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const { rows } = await pool.query<{ restaurant_id: string }>('SELECT restaurant_id FROM prizes WHERE id = $1', [existing.prize_id]);
      const restaurantId = rows[0]?.restaurant_id ?? null;
      pool.end();
      if (restaurantId) {
        logActivity({
          id: randomUUID(),
          restaurant_id: restaurantId,
          action: 'prize_delivered',
          description: `Premio entregado a ${existing.full_name}: ${existing.prize_name}`,
          user_name: delivered_by,
          metadata: { claim_id: id },
        }).catch(() => {});
      }
    }

    return NextResponse.json({ claim });
  } catch (error) {
    console.error('Error delivering claim:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
