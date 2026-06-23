// SCAFFOLD: requires a Google Cloud service account + Wallet API enablement to complete.
// Once you have: GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_JSON
// env vars set, implement using Google's Wallet REST API / Node client library.
// For now, this returns 501 Not Implemented with instructions.
import { NextRequest, NextResponse } from 'next/server';
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await params;
  return NextResponse.json({
    error: 'Google Wallet aún no configurado.',
    setup_needed: ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SERVICE_ACCOUNT_JSON'],
    docs: 'https://developers.google.com/wallet',
  }, { status: 501 });
}
