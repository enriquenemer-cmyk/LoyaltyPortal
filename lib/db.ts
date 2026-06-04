import { Pool } from 'pg';

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

let schemaInitialized = false;

async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS prizes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        reason TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        prize_id TEXT NOT NULL REFERENCES prizes(id),
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending',
        delivered_at TIMESTAMPTZ,
        delivered_by TEXT
      );
    `);
    await client.query(`
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS delivered_by TEXT;
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS restaurant_id TEXT REFERENCES restaurants(id);
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'manager',
        restaurant_id TEXT REFERENCES restaurants(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        user_name TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    schemaInitialized = true;
  } finally {
    client.release();
  }
}

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  logo_url: string | null;
  created_at: string;
};

export type RestaurantStats = {
  total_prizes: number;
  total_claims: number;
  delivered: number;
  pending: number;
};

export type Prize = {
  id: string;
  name: string;
  reason: string;
  start_date: string;
  end_date: string;
  description: string;
  location: string; // comma-separated list of branches
  restaurant_id: string | null;
  cancelled: boolean;
  created_at: string;
};

export type PrizeWithRestaurant = Prize & {
  restaurant_name: string | null;
  claim_count: number;
};

export type ActivityLogEntry = {
  id: string;
  restaurant_id: string | null;
  action: string;
  description: string;
  user_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type DbUser = {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'manager';
  restaurant_id: string | null;
  created_at: string;
};

export type Claim = {
  id: string;
  prize_id: string;
  full_name: string;
  phone: string;
  email: string;
  location: string | null; // branch chosen by customer
  claimed_at: string;
  status: 'pending' | 'delivered';
  delivered_at: string | null;
  delivered_by: string | null;
};

export type ClaimWithPrize = Claim & {
  prize_name: string;
  prize_location: string;   // all available branches (from prize)
  prize_description: string;
};

export async function insertRestaurant(r: Omit<Restaurant, 'created_at'>): Promise<Restaurant> {
  await ensureSchema();
  const { rows } = await getPool().query<Restaurant>(
    `INSERT INTO restaurants (id, name, address, phone) VALUES ($1,$2,$3,$4) RETURNING *`,
    [r.id, r.name, r.address, r.phone ?? null]
  );
  return rows[0];
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  await ensureSchema();
  const { rows } = await getPool().query<Restaurant>('SELECT * FROM restaurants ORDER BY created_at DESC');
  return rows;
}

export async function getRestaurantById(id: string): Promise<Restaurant | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Restaurant>('SELECT * FROM restaurants WHERE id = $1', [id]);
  return rows[0];
}

export async function getRestaurantStats(restaurantId: string): Promise<RestaurantStats> {
  await ensureSchema();
  const { rows } = await getPool().query<{ total_prizes: string; total_claims: string; delivered: string; pending: string }>(`
    SELECT
      COUNT(DISTINCT p.id)::text AS total_prizes,
      COUNT(c.id)::text AS total_claims,
      COUNT(c.id) FILTER (WHERE c.status = 'delivered')::text AS delivered,
      COUNT(c.id) FILTER (WHERE c.status = 'pending')::text AS pending
    FROM prizes p
    LEFT JOIN claims c ON c.prize_id = p.id
    WHERE p.restaurant_id = $1
  `, [restaurantId]);
  const r = rows[0];
  return {
    total_prizes: parseInt(r.total_prizes, 10),
    total_claims: parseInt(r.total_claims, 10),
    delivered: parseInt(r.delivered, 10),
    pending: parseInt(r.pending, 10),
  };
}

export async function getClaimsByRestaurant(restaurantId: string): Promise<ClaimWithPrize[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ClaimWithPrize>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location, p.description AS prize_description
    FROM claims c JOIN prizes p ON c.prize_id = p.id
    WHERE p.restaurant_id = $1
    ORDER BY c.claimed_at DESC
  `, [restaurantId]);
  return rows;
}

export async function insertPrize(prize: Omit<Prize, 'created_at'>): Promise<Prize> {
  await ensureSchema();
  const { rows } = await getPool().query<Prize>(
    `INSERT INTO prizes (id, name, reason, start_date, end_date, description, location, restaurant_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [prize.id, prize.name, prize.reason, prize.start_date, prize.end_date, prize.description, prize.location, prize.restaurant_id ?? null]
  );
  return rows[0];
}

export async function getPrizeById(id: string): Promise<Prize | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Prize>('SELECT * FROM prizes WHERE id = $1', [id]);
  return rows[0];
}

export async function getPrizeClaimCount(prizeId: string): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ count: string }>(
    'SELECT COUNT(*) as count FROM claims WHERE prize_id = $1', [prizeId]
  );
  return parseInt(rows[0].count, 10);
}

export async function insertClaim(
  claim: Omit<Claim, 'claimed_at' | 'status' | 'delivered_at' | 'delivered_by'>
): Promise<Claim> {
  await ensureSchema();
  const { rows } = await getPool().query<Claim>(
    `INSERT INTO claims (id, prize_id, full_name, phone, email, location)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [claim.id, claim.prize_id, claim.full_name, claim.phone, claim.email, claim.location ?? null]
  );
  return rows[0];
}

export async function getClaimById(id: string): Promise<ClaimWithPrize | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<ClaimWithPrize>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location, p.description AS prize_description,
           p.reason, p.start_date, p.end_date
    FROM claims c JOIN prizes p ON c.prize_id = p.id
    WHERE c.id = $1
  `, [id]);
  return rows[0];
}

export async function deliverClaim(id: string, deliveredBy: string): Promise<Claim | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Claim>(
    `UPDATE claims SET status = 'delivered', delivered_at = NOW(), delivered_by = $2
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id, deliveredBy]
  );
  return rows[0];
}

export async function getAllClaims(status?: 'pending' | 'delivered'): Promise<ClaimWithPrize[]> {
  await ensureSchema();
  const where = status ? `WHERE c.status = $1` : '';
  const params = status ? [status] : [];
  const { rows } = await getPool().query<ClaimWithPrize>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location, p.description AS prize_description
    FROM claims c JOIN prizes p ON c.prize_id = p.id
    ${where}
    ORDER BY c.claimed_at DESC
  `, params);
  return rows;
}

export async function getAllPrizes(): Promise<PrizeWithRestaurant[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PrizeWithRestaurant>(`
    SELECT p.*, r.name AS restaurant_name,
           (SELECT COUNT(*) FROM claims c WHERE c.prize_id = p.id)::int AS claim_count
    FROM prizes p
    LEFT JOIN restaurants r ON r.id = p.restaurant_id
    ORDER BY p.created_at DESC
  `);
  return rows;
}

export async function cancelPrize(id: string): Promise<Prize | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Prize>(
    `UPDATE prizes SET cancelled = TRUE WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

export async function updateRestaurant(id: string, fields: { name?: string; address?: string; phone?: string | null; logo_url?: string | null }): Promise<Restaurant | undefined> {
  await ensureSchema();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (fields.name !== undefined) { sets.push(`name = $${i++}`); vals.push(fields.name); }
  if (fields.address !== undefined) { sets.push(`address = $${i++}`); vals.push(fields.address); }
  if (fields.phone !== undefined) { sets.push(`phone = $${i++}`); vals.push(fields.phone); }
  if (fields.logo_url !== undefined) { sets.push(`logo_url = $${i++}`); vals.push(fields.logo_url); }
  if (sets.length === 0) return getRestaurantById(id);
  vals.push(id);
  const { rows } = await getPool().query<Restaurant>(
    `UPDATE restaurants SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  return rows[0];
}

export async function logActivity(entry: Omit<ActivityLogEntry, 'created_at'>): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO activity_log (id, restaurant_id, action, description, user_name, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [entry.id, entry.restaurant_id ?? null, entry.action, entry.description, entry.user_name ?? null, entry.metadata ? JSON.stringify(entry.metadata) : null]
  );
}

export async function getRestaurantActivity(restaurantId: string, limit = 20): Promise<ActivityLogEntry[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ActivityLogEntry>(
    `SELECT * FROM activity_log WHERE restaurant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [restaurantId, limit]
  );
  return rows;
}

export async function createUser(u: Omit<DbUser, 'created_at'>): Promise<DbUser> {
  await ensureSchema();
  const { rows } = await getPool().query<DbUser>(
    `INSERT INTO users (id, username, password_hash, role, restaurant_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [u.id, u.username, u.password_hash, u.role, u.restaurant_id ?? null]
  );
  return rows[0];
}

export async function getUserByUsername(username: string): Promise<DbUser | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<DbUser>('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0];
}
