import { NextRequest, NextResponse } from 'next/server';
import { getGameBundleAnalytics } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const { id } = await params;

  try {
    const analytics = await getGameBundleAnalytics(id);
    return NextResponse.json({ analytics });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Error al cargar las analíticas' }, { status: 500 });
  }
}
