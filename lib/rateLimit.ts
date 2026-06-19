import { NextRequest } from 'next/server';

// ── In-memory fallback (per server instance) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkInMemory(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ── Upstash Redis via HTTP REST (no npm package required) ──
async function checkUpstash(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const windowSec = Math.ceil(windowMs / 1000);

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSec, 'NX'],
    ]),
  });

  if (!res.ok) return true; // fail open — don't block on Redis errors
  const data = await res.json() as [{ result: number }, unknown];
  const count = data[0]?.result ?? 1;
  return count <= limit;
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return checkUpstash(key, limit, windowMs).catch(() => checkInMemory(key, limit, windowMs));
  }
  return checkInMemory(key, limit, windowMs);
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}
