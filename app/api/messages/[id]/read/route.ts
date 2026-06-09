import { NextRequest, NextResponse } from 'next/server';
import { markMessageRead } from '@/lib/db';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  }
  try {
    const msg = await markMessageRead(id);
    if (!msg) {
      return NextResponse.json({ error: 'Mensaje no encontrado o ya leído' }, { status: 404 });
    }
    return NextResponse.json({ message: msg });
  } catch (err) {
    console.error('[PATCH /api/messages/:id/read]', err);
    return NextResponse.json({ error: 'Error al marcar como leído' }, { status: 500 });
  }
}
