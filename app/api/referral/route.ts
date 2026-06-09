import { NextRequest, NextResponse } from 'next/server';
import { getReferralCount } from '@/lib/db';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }
  const count = await getReferralCount(code.toUpperCase());
  return NextResponse.json({ code: code.toUpperCase(), count });
}
