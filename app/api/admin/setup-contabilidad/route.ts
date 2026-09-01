import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const pool = getPool();

  // Nota: la tabla `suppliers` YA EXISTE (la usa Inventario) con columnas
  // `contact_phone`/`contact_email` e `id TEXT` — no se vuelve a crear aquí
  // para no chocar con ese esquema. supplier_id abajo usa TEXT para poder
  // referenciarla.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS supplier_purchases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id TEXT,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      supplier_name TEXT,
      invoice_number TEXT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      notes TEXT,
      payment_status TEXT NOT NULL DEFAULT 'pagado',
      payment_date DATE,
      iva_pct NUMERIC(5,2) DEFAULT 0,
      rfc TEXT,
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
      restaurant_id TEXT,
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
      restaurant_id TEXT,
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      category TEXT NOT NULL DEFAULT 'general',
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      iva NUMERIC(12,2) DEFAULT 0,
      description TEXT,
      reference_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id TEXT,
      month DATE NOT NULL,
      category TEXT NOT NULL,
      budgeted NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(restaurant_id, month, category)
    );

    CREATE TABLE IF NOT EXISTS cash_register_closes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id TEXT,
      diferencia NUMERIC(12,2) NOT NULL DEFAULT 0,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id TEXT,
      supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
      supplier_name TEXT,
      status TEXT NOT NULL DEFAULT 'pendiente',
      total NUMERIC(12,2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  return NextResponse.json({ ok: true });
}
