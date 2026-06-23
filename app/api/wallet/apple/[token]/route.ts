// SCAFFOLD: requires Apple Developer certificate + Pass Type ID to complete.
// Once you have: APPLE_PASS_CERT (P12 base64), APPLE_PASS_CERT_PASSWORD, APPLE_PASS_TYPE_ID, APPLE_TEAM_ID
// env vars set, implement using a library like `passkit-generator` (npm install passkit-generator).
// For now, this returns 501 Not Implemented with instructions.
import { NextRequest, NextResponse } from 'next/server';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await params;
  return NextResponse.json({
    error: 'Apple Wallet aún no configurado.',
    setup_needed: ['APPLE_PASS_CERT', 'APPLE_PASS_CERT_PASSWORD', 'APPLE_PASS_TYPE_ID', 'APPLE_TEAM_ID'],
    docs: 'https://developer.apple.com/documentation/walletpasses',
  }, { status: 501 });
}
