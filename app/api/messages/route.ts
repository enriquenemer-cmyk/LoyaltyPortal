import { NextRequest, NextResponse } from 'next/server';
import { insertInternalMessage, getMessagesForContact } from '@/lib/db';

export async function GET(req: NextRequest) {
  const contact = req.nextUrl.searchParams.get('contact');
  if (!contact) {
    return NextResponse.json({ error: 'contact param required' }, { status: 400 });
  }
  try {
    const messages = await getMessagesForContact(contact.trim());
    return NextResponse.json({ messages });
  } catch (err) {
    console.error('[GET /api/messages]', err);
    return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to_phone, to_email, subject, body: msgBody, prize_id, claim_id, from_role } = body;
    if (!to_phone || !subject || !msgBody) {
      return NextResponse.json({ error: 'to_phone, subject y body son requeridos' }, { status: 400 });
    }
    const msg = await insertInternalMessage({
      id: crypto.randomUUID(),
      from_role: from_role || 'system',
      to_phone: to_phone.trim(),
      to_email: to_email ?? null,
      subject: subject.trim(),
      body: msgBody.trim(),
      prize_id: prize_id ?? null,
      claim_id: claim_id ?? null,
    });
    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/messages]', err);
    return NextResponse.json({ error: 'Error al crear mensaje' }, { status: 500 });
  }
}
