import { NextRequest, NextResponse } from 'next/server';
import { getPool, logActivity, ensureSchema } from '@/lib/db';

const MIN_POINTS = 10;

export async function POST(req: NextRequest) {
  let body: { from_token?: string; to_phone?: string; points?: number; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const { from_token, to_phone, message } = body;
  const points = Number(body.points);

  if (!from_token || typeof from_token !== 'string') {
    return NextResponse.json({ error: 'Falta el token del remitente.' }, { status: 400 });
  }
  if (!to_phone || typeof to_phone !== 'string') {
    return NextResponse.json({ error: 'Falta el teléfono del destinatario.' }, { status: 400 });
  }
  if (!Number.isInteger(points) || points < MIN_POINTS) {
    return NextResponse.json({ error: `Los puntos deben ser un entero de al menos ${MIN_POINTS}.` }, { status: 400 });
  }
  if (message && message.length > 100) {
    return NextResponse.json({ error: 'El mensaje no puede superar 100 caracteres.' }, { status: 400 });
  }

  await ensureSchema();
  const pool = getPool();

  const { rows: senderRows } = await pool.query(
    `SELECT phone, email, total_points FROM customer_points WHERE public_token = $1`,
    [from_token]
  );
  const sender = senderRows[0];
  if (!sender) {
    return NextResponse.json({ error: 'Cuenta no encontrada.' }, { status: 404 });
  }

  if (to_phone === sender.phone) {
    return NextResponse.json({ error: 'No puedes regalarte puntos a ti mismo.' }, { status: 400 });
  }

  if (points > sender.total_points) {
    return NextResponse.json({ error: 'No tienes suficientes puntos.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deduct from sender (only total_points, not lifetime_points)
    const { rows: updatedSenderRows } = await client.query(
      `UPDATE customer_points SET total_points = total_points - $2, updated_at = NOW()
       WHERE phone = $1 RETURNING total_points`,
      [sender.phone, points]
    );
    const newBalance = updatedSenderRows[0].total_points;

    // Recipient: check if exists
    const { rows: recipientRows } = await client.query(
      `SELECT phone FROM customer_points WHERE phone = $1`,
      [to_phone]
    );

    if (recipientRows[0]) {
      await client.query(
        `UPDATE customer_points SET total_points = total_points + $2, lifetime_points = lifetime_points + $2, updated_at = NOW()
         WHERE phone = $1`,
        [to_phone, points]
      );
    } else {
      const id = crypto.randomUUID();
      const token = crypto.randomUUID().replace(/-/g, '');
      await client.query(
        `INSERT INTO customer_points (id, phone, email, total_points, lifetime_points, tier, public_token, updated_at)
         VALUES ($1, $2, '', $3, $3, 'bronze', $4, NOW())`,
        [id, to_phone, points, token]
      );
    }

    const transferId = crypto.randomUUID();
    await client.query(
      `INSERT INTO point_transfers (id, from_phone, to_phone, points, message) VALUES ($1,$2,$3,$4,$5)`,
      [transferId, sender.phone, to_phone, points, message ?? null]
    );

    await client.query('COMMIT');

    logActivity({
      id: crypto.randomUUID(),
      restaurant_id: null,
      action: 'points_gifted',
      description: `${sender.phone} regaló ${points} puntos a ${to_phone}`,
      user_name: sender.phone,
      metadata: { from_phone: sender.phone, to_phone, points, message: message ?? null },
    }).catch(() => {});

    return NextResponse.json({ success: true, new_balance: newBalance });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
