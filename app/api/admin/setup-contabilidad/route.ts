import { NextRequest, NextResponse } from 'next/server';
import { ensureAccountingSchema } from '@/lib/db';
import { getSession } from '@/lib/session';

// Mantenido por compatibilidad: las páginas de contabilidad la llaman al
// cargar (fire-and-forget). El esquema real ya se asegura de forma
// sincrónica en cada endpoint vía ensureAccountingSchema(), así que esta
// llamada ya no es indispensable, pero no hace daño dejarla.
export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  await ensureAccountingSchema();
  return NextResponse.json({ ok: true });
}
