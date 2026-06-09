import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') ?? '').trim();
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '13', 10), 50);

  if (!q || q.length < 1) {
    return NextResponse.json({ clients: [], prizes: [], restaurants: [] });
  }

  const pool = getPool();
  const pattern = `%${q}%`;

  try {
    const [claimsResult, prizesResult, restaurantsResult] = await Promise.all([
      pool.query<{
        id: string;
        full_name: string;
        phone: string;
        email: string;
        prize_name: string;
        restaurant_name: string | null;
        claimed_at: string;
        status: string;
      }>(
        `SELECT c.id, c.full_name, c.phone, c.email, c.claimed_at, c.status,
                p.name AS prize_name, r.name AS restaurant_name
         FROM claims c
         JOIN prizes p ON p.id = c.prize_id
         LEFT JOIN restaurants r ON r.id = p.restaurant_id
         WHERE c.full_name ILIKE $1
            OR c.email ILIKE $1
            OR c.phone ILIKE $1
         ORDER BY c.claimed_at DESC
         LIMIT $2`,
        [pattern, 5]
      ),
      pool.query<{
        id: string;
        name: string;
        restaurant_name: string | null;
        created_at: string;
      }>(
        `SELECT p.id, p.name, p.created_at, r.name AS restaurant_name
         FROM prizes p
         LEFT JOIN restaurants r ON r.id = p.restaurant_id
         WHERE p.name ILIKE $1
         ORDER BY p.created_at DESC
         LIMIT $2`,
        [pattern, 5]
      ),
      pool.query<{
        id: string;
        name: string;
        address: string;
      }>(
        `SELECT id, name, address
         FROM restaurants
         WHERE name ILIKE $1
         ORDER BY name ASC
         LIMIT $2`,
        [pattern, 3]
      ),
    ]);

    return NextResponse.json({
      clients: claimsResult.rows,
      prizes: prizesResult.rows,
      restaurants: restaurantsResult.rows,
    });
  } catch (err) {
    console.error('[/api/search]', err);
    return NextResponse.json({ clients: [], prizes: [], restaurants: [] }, { status: 500 });
  }
}
