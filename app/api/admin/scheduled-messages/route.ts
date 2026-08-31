import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

const VALID_CHANNELS = ['push', 'email'];
const VALID_TARGETS = ['all', 'inactive'];

export async function GET() {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const { rows } = await getPool().query(
    `SELECT * FROM scheduled_messages ORDER BY send_at DESC LIMIT 100`
  );
  return NextResponse.json({ messages: rows });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, message, target_type, inactive_days, channels, send_at } = body as {
    title?: string;
    message?: string;
    target_type?: string;
    inactive_days?: number;
    channels?: string[];
    send_at?: string;
  };

  if (!title || !message || !send_at) {
    return NextResponse.json({ error: 'Título, mensaje y fecha de envío son requeridos.' }, { status: 400 });
  }
  const targetType = target_type && VALID_TARGETS.includes(target_type) ? target_type : 'all';
  const sendAtDate = new Date(send_at);
  if (Number.isNaN(sendAtDate.getTime()) || sendAtDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'La fecha de envío debe ser futura.' }, { status: 400 });
  }
  const selectedChannels = (channels ?? ['push', 'email']).filter((c) => VALID_CHANNELS.includes(c));
  if (selectedChannels.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos un canal de envío.' }, { status: 400 });
  }
  if (targetType === 'inactive' && (!inactive_days || inactive_days < 1)) {
    return NextResponse.json({ error: 'Días de inactividad inválidos.' }, { status: 400 });
  }

  const id = randomUUID();
  const { rows } = await getPool().query(
    `INSERT INTO scheduled_messages (id, title, message, target_type, inactive_days, channels, send_at, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, title, message, targetType, targetType === 'inactive' ? inactive_days : null, selectedChannels, sendAtDate.toISOString(), session.username]
  );

  return NextResponse.json({ message: rows[0] }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido.' }, { status: 400 });

  const { rows } = await getPool().query(
    `UPDATE scheduled_messages SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING id`,
    [id]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: 'No se puede cancelar (ya fue enviado o no existe).' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
