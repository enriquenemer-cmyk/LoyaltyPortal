import { getPool } from '@/lib/db';

// ── Pregúntale a tus datos: caja de herramientas segura ─────────────────────
// Cada función ejecuta una consulta parametrizada predefinida. GPT NUNCA
// genera SQL — solo elige cuál de estas funciones llamar y con qué argumentos
// (vía tool-calling). Esto evita inyección SQL / exfiltración de datos.

export type SalesForDateRange = {
  total: number;
  cash: number;
  card: number;
  other: number;
  ticket_count: number;
  days: number;
};

export async function getSalesForDateRange(
  startDate: string,
  endDate: string,
  restaurantId?: string
): Promise<SalesForDateRange> {
  const pool = getPool();
  const params: unknown[] = [startDate, endDate];
  let restaurantFilter = '';
  if (restaurantId) {
    params.push(restaurantId);
    restaurantFilter = `AND restaurant_id = $${params.length}`;
  }
  const { rows } = await pool.query<{
    total: string | null;
    cash: string | null;
    card: string | null;
    other: string | null;
    ticket_count: string | null;
    days: string | null;
  }>(
    `SELECT
      COALESCE(SUM(total_amount), 0) AS total,
      COALESCE(SUM(cash_amount), 0) AS cash,
      COALESCE(SUM(card_amount), 0) AS card,
      COALESCE(SUM(other_amount), 0) AS other,
      COALESCE(SUM(ticket_count), 0) AS ticket_count,
      COUNT(*) AS days
     FROM daily_sales
     WHERE sale_date >= $1 AND sale_date <= $2 ${restaurantFilter}`,
    params
  );
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    cash: Number(row?.cash ?? 0),
    card: Number(row?.card ?? 0),
    other: Number(row?.other ?? 0),
    ticket_count: Number(row?.ticket_count ?? 0),
    days: Number(row?.days ?? 0),
  };
}

export type TopCustomer = {
  phone: string;
  full_name: string | null;
  total_points: number;
  lifetime_points: number;
  tier: string;
};

export async function getTopCustomers(limit: number): Promise<TopCustomer[]> {
  const pool = getPool();
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 5, 1), 50);
  const { rows } = await pool.query<TopCustomer & { total_points: string; lifetime_points: string }>(
    `SELECT phone, full_name, total_points, lifetime_points, tier
     FROM customer_points
     ORDER BY lifetime_points DESC
     LIMIT $1`,
    [safeLimit]
  );
  return rows.map((r) => ({
    phone: r.phone,
    full_name: r.full_name,
    total_points: Number(r.total_points),
    lifetime_points: Number(r.lifetime_points),
    tier: r.tier,
  }));
}

export type ClaimsCountForDateRange = {
  total: number;
  by_status: { status: string; count: number }[];
};

export async function getClaimsCountForDateRange(
  startDate: string,
  endDate: string
): Promise<ClaimsCountForDateRange> {
  const pool = getPool();
  const { rows } = await pool.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM claims
     WHERE claimed_at >= $1 AND claimed_at <= $2::date + INTERVAL '1 day'
     GROUP BY status
     ORDER BY count DESC`,
    [startDate, endDate]
  );
  const byStatus = rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  const total = byStatus.reduce((sum, r) => sum + r.count, 0);
  return { total, by_status: byStatus };
}

export type TopPrize = { name: string; count: number };

export async function getTopPrizes(limit: number): Promise<TopPrize[]> {
  const pool = getPool();
  const safeLimit = Math.min(Math.max(Math.floor(limit) || 5, 1), 50);
  const { rows } = await pool.query<{ name: string; count: string }>(
    `SELECT p.name, COUNT(c.id)::text AS count
     FROM prizes p
     JOIN claims c ON c.prize_id = p.id
     WHERE c.claimed_at > NOW() - INTERVAL '30 days'
     GROUP BY p.id, p.name
     ORDER BY COUNT(c.id) DESC
     LIMIT $1`,
    [safeLimit]
  );
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}

export type InactiveCustomersCount = {
  count: number;
  days_threshold: number;
};

export async function getInactiveCustomersCount(daysThreshold: number): Promise<InactiveCustomersCount> {
  const pool = getPool();
  const safeDays = Math.min(Math.max(Math.floor(daysThreshold) || 30, 1), 730);
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM (
       SELECT phone, MAX(claimed_at) AS last_claim
       FROM claims
       GROUP BY phone
     ) sub
     WHERE last_claim < NOW() - ($1 || ' days')::INTERVAL`,
    [safeDays]
  );
  return { count: Number(rows[0]?.count ?? 0), days_threshold: safeDays };
}

export type ConversionRateResult = {
  total_prizes: number;
  total_claims: number;
  rate: number;
};

export async function getConversionRate(): Promise<ConversionRateResult> {
  const pool = getPool();
  const { rows } = await pool.query<{
    total_prizes: string;
    total_claims: string;
    rate: string | null;
  }>(
    `SELECT
      COUNT(DISTINCT p.id)::text AS total_prizes,
      COUNT(DISTINCT c.id)::text AS total_claims,
      ROUND(COUNT(DISTINCT c.id)::numeric / NULLIF(COUNT(DISTINCT p.id), 0) * 100, 1)::text AS rate
     FROM prizes p
     LEFT JOIN claims c ON c.prize_id = p.id
     WHERE p.created_at > NOW() - INTERVAL '30 days'
       AND p.cancelled = false`
  );
  const row = rows[0];
  return {
    total_prizes: parseInt(row?.total_prizes ?? '0', 10),
    total_claims: parseInt(row?.total_claims ?? '0', 10),
    rate: parseFloat(row?.rate ?? '0'),
  };
}

export type InventoryAlert = {
  name: string;
  current_stock: number;
  min_stock_alert: number;
  unit: string;
};

export async function getCurrentInventoryAlerts(): Promise<InventoryAlert[]> {
  const pool = getPool();
  const { rows } = await pool.query<{
    name: string;
    current_stock: string;
    min_stock_alert: string;
    unit: string;
  }>(
    `SELECT name, current_stock, min_stock_alert, unit
     FROM inventory_products
     WHERE active = true AND current_stock <= min_stock_alert
     ORDER BY (current_stock - min_stock_alert) ASC
     LIMIT 50`
  );
  return rows.map((r) => ({
    name: r.name,
    current_stock: Number(r.current_stock),
    min_stock_alert: Number(r.min_stock_alert),
    unit: r.unit,
  }));
}
