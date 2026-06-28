import { NextRequest, NextResponse } from 'next/server';
import { getAllPrizeRules, insertPrizeRule, togglePrizeRule } from '@/lib/db';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const rules = await getAllPrizeRules();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching prize rules:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.username) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    const body = await request.json();

    // Toggle active state
    if (body._action === 'toggle') {
      const { id, active } = body;
      if (!id || active === undefined) {
        return NextResponse.json({ error: 'id y active son obligatorios.' }, { status: 400 });
      }
      const rule = await togglePrizeRule(id, active);
      if (!rule) return NextResponse.json({ error: 'Regla no encontrada.' }, { status: 404 });
      return NextResponse.json({ rule });
    }

    const { name, trigger_type, trigger_value, prize_template, prize_reason, prize_description, validity_days, restaurant_id } = body;

    if (!name || !trigger_type || !prize_template || !prize_reason || !prize_description) {
      return NextResponse.json({ error: 'Campos obligatorios faltantes.' }, { status: 400 });
    }

    const validTriggers = ['nth_claim', 'birthday', 'points_milestone'];
    if (!validTriggers.includes(trigger_type)) {
      return NextResponse.json({ error: 'trigger_type inválido.' }, { status: 400 });
    }

    const rule = await insertPrizeRule({
      id: randomUUID(),
      name,
      trigger_type,
      trigger_value: Number(trigger_value) || 5,
      prize_template,
      prize_reason,
      prize_description,
      validity_days: Number(validity_days) || 30,
      restaurant_id: restaurant_id || null,
      active: true,
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Error creating prize rule:', error);
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
  }
}
