import { NextRequest, NextResponse } from 'next/server';
import { toggleGameBundle } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const body = await req.json();
    const { active } = body as { active: boolean };
    if (typeof active !== 'boolean') {
      return NextResponse.json({ error: 'active debe ser booleano' }, { status: 400 });
    }
    const bundle = await toggleGameBundle(id, active);
    if (!bundle) return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    return NextResponse.json({ bundle });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al actualizar la campaña' }, { status: 500 });
  }
}
