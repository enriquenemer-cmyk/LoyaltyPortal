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
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    schemaInitialized = true;
  } finally {
    client.release();
  }
}

export type Prize = {
  id: string;
  name: string;
  reason: string;
  start_date: string;
  end_date: string;
  description: string;
  location: string;
  created_at: string;
};

export type Claim = {
  id: string;
  prize_id: string;
  full_name: string;
  phone: string;
  email: string;
  claimed_at: string;
};

export type ClaimWithPrize = Claim & {
  prize_name: string;
  prize_location: string;
};

export async function insertPrize(prize: Omit<Prize, 'created_at'>): Promise<Prize> {
  await ensureSchema();
  const { rows } = await getPool().query<Prize>(
    `INSERT INTO prizes (id, name, reason, start_date, end_date, description, location)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [prize.id, prize.name, prize.reason, prize.start_date, prize.end_date, prize.description, prize.location]
  );
  return rows[0];
}

export async function getPrizeById(id: string): Promise<Prize | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Prize>('SELECT * FROM prizes WHERE id = $1', [id]);
  return rows[0];
}

export async function insertClaim(claim: Omit<Claim, 'claimed_at'>): Promise<Claim> {
  await ensureSchema();
  const { rows } = await getPool().query<Claim>(
    `INSERT INTO claims (id, prize_id, full_name, phone, email)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [claim.id, claim.prize_id, claim.full_name, claim.phone, claim.email]
  );
  return rows[0];
}

export async function getAllClaims(): Promise<ClaimWithPrize[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ClaimWithPrize>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location
    FROM claims c JOIN prizes p ON c.prize_id = p.id
    ORDER BY c.claimed_at DESC
  `);
  return rows;
}
