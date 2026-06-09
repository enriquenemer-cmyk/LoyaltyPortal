import { NextRequest, NextResponse } from 'next/server';
import { getClaimById } from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> }
) {
  const { claimId } = await params;

  const issuerId     = process.env.GOOGLE_WALLET_ISSUER_ID;
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey   = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n');

  if (!issuerId || !serviceEmail || !privateKey) {
    return NextResponse.json({ error: 'Google Wallet no configurado.' }, { status: 503 });
  }

  const claim = await getClaimById(claimId);
  if (!claim) {
    return NextResponse.json({ error: 'Cobro no encontrado.' }, { status: 404 });
  }

  const origin   = process.env.NEXT_PUBLIC_APP_URL || 'https://premia-tierra.vercel.app';
  const classId  = `${issuerId}.premia-tierra-pass`;
  const objectId = `${issuerId}.claim-${claimId.replace(/-/g, '')}`;

  const passObject = {
    id: objectId,
    classId,
    genericType: 'GENERIC_TYPE_UNSPECIFIED',
    hexBackgroundColor: '#059669',
    logo: {
      sourceUri: { uri: `${origin}/icon.svg` },
      contentDescription: { defaultValue: { language: 'es-MX', value: 'Premia Tierra' } },
    },
    cardTitle:  { defaultValue: { language: 'es-MX', value: 'Premia Tierra' } },
    subheader:  { defaultValue: { language: 'es-MX', value: 'Ticket de Cobro' } },
    header:     { defaultValue: { language: 'es-MX', value: claim.prize_name } },
    textModulesData: [
      { id: 'cliente',  header: 'CLIENTE',   body: claim.full_name },
      { id: 'sucursal', header: 'COBRAR EN', body: claim.prize_location || 'Ver con el establecimiento' },
    ],
    barcode: {
      type: 'QR_CODE',
      value: `${origin}/cajero/${claimId}`,
      alternateText: `Cobro: ${claim.prize_name}`,
    },
    state: claim.status === 'delivered' ? 'EXPIRED' : 'ACTIVE',
  };

  const token = jwt.sign(
    {
      iss: serviceEmail,
      aud: 'google',
      origins: [origin],
      typ: 'savetowallet',
      payload: { genericObjects: [passObject] },
    },
    privateKey,
    { algorithm: 'RS256' }
  );

  return NextResponse.json({ saveUrl: `https://pay.google.com/gp/v/save/${token}` });
}
