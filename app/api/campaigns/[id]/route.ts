import { NextRequest, NextResponse } from 'next/server';
import { getCampaignById, updateCampaign, deleteCampaign } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const campaign = await getCampaignById(id);
    if (!campaign) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (err) {
    console.error('Error fetching campaign:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.username) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { name, description, restaurant_id, qr_dot_color, qr_background, qr_dot_style, qr_corner_style, qr_gradient_end } = body;
    const campaign = await updateCampaign(id, {
      name,
      description,
      restaurant_id,
      qr_dot_color,
      qr_background,
      qr_dot_style,
      qr_corner_style,
      qr_gradient_end,
    });
    if (!campaign) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 });
    return NextResponse.json({ campaign });
  } catch (err) {
    console.error('Error updating campaign:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session.username) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    const { id } = await params;
    await deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting campaign:', err);
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 });
  }
}
