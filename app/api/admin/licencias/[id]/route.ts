import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';
import bcrypt from 'bcryptjs';

type Params = { params: Promise<{ id: string }> };

// PATCH — update billing_status, plan, price, notes, or reset password
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.username || session.restaurantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const pool = getPool();

  // Reset password for main user
  if (body.new_password) {
    const hash = await bcrypt.hash(body.new_password, 10);
    await pool.query(
      `UPDATE users SET password_hash=$1 WHERE restaurant_id=$2 AND role='manager'`,
      [hash, id]
    );
    return NextResponse.json({ ok: true });
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (body.billing_status !== undefined) { fields.push(`billing_status=$${i++}`); values.push(body.billing_status); }
  if (body.billing_plan !== undefined)   { fields.push(`billing_plan=$${i++}`);   values.push(body.billing_plan); }
  if (body.monthly_price !== undefined)  { fields.push(`monthly_price=$${i++}`);  values.push(body.monthly_price); }
  if (body.trial_ends_at !== undefined)  { fields.push(`trial_ends_at=$${i++}`);  values.push(body.trial_ends_at || null); }
  if (body.notes !== undefined)          { fields.push(`notes=$${i++}`);           values.push(body.notes); }
  if (body.owner_name !== undefined)     { fields.push(`owner_name=$${i++}`);      values.push(body.owner_name); }
  if (body.owner_email !== undefined)    { fields.push(`owner_email=$${i++}`);     values.push(body.owner_email); }
  if (body.phone !== undefined)          { fields.push(`phone=$${i++}`);           values.push(body.phone); }

  if (!fields.length) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });

  values.push(id);
  const { rows: [row] } = await pool.query(
    `UPDATE restaurants SET ${fields.join(',')} WHERE id=$${i} RETURNING *`,
    values
  );

  return NextResponse.json(row ?? { ok: true });
}

// DELETE — remove tenant and all their users
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session.username || session.restaurantId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const pool = getPool();
  await pool.query(`DELETE FROM users WHERE restaurant_id=$1`, [id]);
  await pool.query(`DELETE FROM restaurants WHERE id=$1`, [id]);
  return NextResponse.json({ ok: true });
}
