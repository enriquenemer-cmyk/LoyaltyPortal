import { NextRequest, NextResponse } from 'next/server';
import { getPool, ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

// Ventas con method != 'dividida' cuentan por su total completo; ventas
// 'dividida' se descomponen en pos_sale_payments para atribuir cada parte a
// su método real (efectivo/tarjeta/otro) — así el arqueo de caja sigue
// cuadrando aunque la cuenta se haya pagado entre varias personas/métodos.
const BY_PAYMENT_METHOD_SQL = `
  SELECT method, COUNT(*)::text AS count, COALESCE(SUM(amount),0)::text AS total
  FROM (
    SELECT s.payment_method AS method, s.total_amount AS amount
    FROM pos_sales s
    WHERE s.restaurant_id IS NOT DISTINCT FROM $1 AND s.created_at::date = CURRENT_DATE
      AND s.cancelled_at IS NULL AND s.payment_method != 'dividida'
    UNION ALL
    SELECT p.method, p.amount
    FROM pos_sale_payments p
    JOIN pos_sales s ON s.id = p.sale_id
    WHERE s.restaurant_id IS NOT DISTINCT FROM $1 AND s.created_at::date = CURRENT_DATE AND s.cancelled_at IS NULL
  ) x
  GROUP BY method
`;

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;

    const pool = getPool();
    const [incomeRes, expenseRes, posRes, claimsRes, byMethodRes, cutRes] = await Promise.all([
      pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(amount),0)::text AS total FROM accounting_entries
         WHERE restaurant_id IS NOT DISTINCT FROM $1 AND type='income' AND date=CURRENT_DATE`,
        [restaurantId]
      ),
      pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(amount),0)::text AS total FROM accounting_entries
         WHERE restaurant_id IS NOT DISTINCT FROM $1 AND type='expense' AND date=CURRENT_DATE`,
        [restaurantId]
      ),
      pool.query<{ count: string; total: string }>(
        `SELECT COUNT(*)::text AS count, COALESCE(SUM(total_amount),0)::text AS total
         FROM pos_sales WHERE restaurant_id IS NOT DISTINCT FROM $1 AND created_at::date=CURRENT_DATE AND cancelled_at IS NULL`,
        [restaurantId]
      ).catch(() => ({ rows: [{ count: '0', total: '0' }] })),
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM claims c
         JOIN prizes p ON p.id = c.prize_id
         WHERE p.restaurant_id IS NOT DISTINCT FROM $1 AND c.claimed_at::date=CURRENT_DATE`,
        [restaurantId]
      ).catch(() => ({ rows: [{ count: '0' }] })),
      pool.query<{ method: string; total: string; count: string }>(BY_PAYMENT_METHOD_SQL, [restaurantId])
        .catch(() => ({ rows: [] })),
      pool.query(
        `SELECT id, counted_cash, system_cash, difference, bank_movement_id, closed_by, closed_at
         FROM cash_cuts WHERE COALESCE(restaurant_id,'') = COALESCE($1,'') AND date = CURRENT_DATE`,
        [restaurantId]
      ),
    ]);

    const income = parseFloat(incomeRes.rows[0]?.total ?? '0');
    const expense = parseFloat(expenseRes.rows[0]?.total ?? '0');

    return NextResponse.json({
      date: new Date().toISOString().slice(0, 10),
      income,
      expense,
      net: income - expense,
      pos_sales: parseInt(posRes.rows[0]?.count ?? '0'),
      pos_total: parseFloat(posRes.rows[0]?.total ?? '0'),
      claims_today: parseInt(claimsRes.rows[0]?.count ?? '0'),
      by_payment_method: byMethodRes.rows,
      cash_cut: cutRes.rows[0] ?? null,
    });
  } catch (err) {
    console.error('[/api/admin/corte-caja GET]', err);
    return NextResponse.json({ error: 'Error al obtener el corte de caja' }, { status: 500 });
  }
}

// Cierra el corte de caja del día: guarda cuánto efectivo se contó físicamente
// frente a lo que el sistema esperaba, y registra la diferencia si la hay.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let body: { counted_cash?: number | string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo de la solicitud inválido' }, { status: 400 });
  }
  const countedCash = Number(body.counted_cash);
  if (!Number.isFinite(countedCash) || countedCash < 0) {
    return NextResponse.json({ error: 'El efectivo contado debe ser un número válido' }, { status: 400 });
  }

  try {
    await ensureAccountingSchema();
    const restaurantId = session.restaurantId ?? null;
    const pool = getPool();

    const { rows: byMethod } = await pool.query<{ method: string; total: string }>(BY_PAYMENT_METHOD_SQL, [restaurantId]);
    const systemCash = Number(byMethod.find((m) => m.method === 'efectivo')?.total ?? 0);
    const systemCard = Number(byMethod.find((m) => m.method === 'tarjeta')?.total ?? 0);
    const systemOther = Number(byMethod.find((m) => m.method === 'otro')?.total ?? 0);
    const difference = Math.round((countedCash - systemCash) * 100) / 100;

    const { rows: [cut] } = await pool.query(
      `INSERT INTO cash_cuts (restaurant_id, date, system_cash, system_card, system_other, counted_cash, difference, closed_by)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (COALESCE(restaurant_id, ''), date)
       DO UPDATE SET system_cash = $2, system_card = $3, system_other = $4, counted_cash = $5, difference = $6, closed_by = $7, closed_at = NOW()
       RETURNING *`,
      [restaurantId, systemCash, systemCard, systemOther, countedCash, difference, session.username]
    );

    if (Math.abs(difference) > 0.005) {
      await pool.query(
        `INSERT INTO accounting_entries (restaurant_id, date, type, category, amount, description)
         VALUES ($1, CURRENT_DATE, $2, 'corte_caja', $3, $4)`,
        [
          restaurantId,
          difference < 0 ? 'expense' : 'income',
          Math.abs(difference),
          `Corte de caja — diferencia de ${difference > 0 ? '+' : ''}${difference} entre lo contado y lo esperado`,
        ]
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, cash_cut: cut });
  } catch (err) {
    console.error('[/api/admin/corte-caja POST]', err);
    return NextResponse.json({ error: 'Error al cerrar el corte de caja' }, { status: 500 });
  }
}
