import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.restaurantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL,
      name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS supplier_purchases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL,
      supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
      supplier_name TEXT,
      invoice_number TEXT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS supplier_purchase_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_id UUID NOT NULL REFERENCES supplier_purchases(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'pza',
      unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
      total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED
    );

    CREATE TABLE IF NOT EXISTS product_cost_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      type TEXT NOT NULL DEFAULT 'simple',
      unit TEXT DEFAULT 'pza',
      cost_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
      selling_price NUMERIC(12,2),
      margin_pct NUMERIC(6,2),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES product_cost_cards(id) ON DELETE CASCADE,
      ingredient_name TEXT NOT NULL,
      quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
      unit TEXT DEFAULT 'g',
      unit_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
      total_cost NUMERIC(12,4) GENERATED ALWAYS AS (quantity * unit_cost) STORED
    );

    CREATE TABLE IF NOT EXISTS accounting_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      category TEXT NOT NULL DEFAULT 'general',
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      description TEXT,
      reference_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  return NextResponse.json({ ok: true });
}
