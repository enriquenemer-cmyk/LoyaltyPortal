import { Pool } from 'pg';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 30000,
      max: 10,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

let schemaInitialized = false;

export async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS prizes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        reason TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        prize_id TEXT NOT NULL REFERENCES prizes(id),
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'pending',
        delivered_at TIMESTAMPTZ,
        delivered_by TEXT
      );
    `);
    await client.query(`
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS delivered_by TEXT;
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS restaurant_id TEXT REFERENCES restaurants(id);
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS cancelled BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS logo_url TEXT;
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#2563EB';
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_maps_url TEXT;
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS referral_code TEXT;
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS referred_by TEXT;
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS generated_by TEXT;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS max_uses INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS campaign_id TEXT;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS stock_limit INTEGER;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS valid_hours TEXT;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS valid_days TEXT;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS activate_at TIMESTAMPTZ;
      ALTER TABLE prizes ADD COLUMN IF NOT EXISTS game_type TEXT;
    `);
    await client.query(`
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS points_earned INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS customer_points (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        total_points INTEGER NOT NULL DEFAULT 0,
        lifetime_points INTEGER NOT NULL DEFAULT 0,
        tier TEXT NOT NULL DEFAULT 'bronze',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS customer_points_phone ON customer_points(phone);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        restaurant_id TEXT REFERENCES restaurants(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS qr_dot_color TEXT DEFAULT '#0f172a';
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS qr_background TEXT DEFAULT '#ffffff';
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS qr_dot_style TEXT DEFAULT 'square';
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS qr_corner_style TEXT DEFAULT 'square';
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS qr_gradient_end TEXT;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'manager',
        restaurant_id TEXT REFERENCES restaurants(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS activity_log (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        user_name TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS prize_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        trigger_value INTEGER NOT NULL DEFAULT 5,
        prize_template TEXT NOT NULL,
        prize_reason TEXT NOT NULL,
        prize_description TEXT NOT NULL,
        validity_days INTEGER NOT NULL DEFAULT 30,
        restaurant_id TEXT REFERENCES restaurants(id),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_tiers (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
        min_amount NUMERIC NOT NULL DEFAULT 0,
        max_amount NUMERIC,
        prize_name TEXT NOT NULL,
        prize_description TEXT NOT NULL,
        game_type TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS ticket_claims (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
        amount NUMERIC NOT NULL,
        prize_name TEXT NOT NULL,
        prize_description TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        location TEXT,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE ticket_claims ADD COLUMN IF NOT EXISTS image_hash TEXT;
      ALTER TABLE ticket_claims ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
      ALTER TABLE ticket_claims ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;
      ALTER TABLE ticket_claims ADD COLUMN IF NOT EXISTS redeemed_by TEXT;
      ALTER TABLE ticket_claims ADD COLUMN IF NOT EXISTS consolation_code TEXT;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_ticket_config (
        restaurant_id TEXT PRIMARY KEY REFERENCES restaurants(id),
        consolation_prize_name TEXT NOT NULL DEFAULT 'Premio de consolación',
        consolation_prize_description TEXT NOT NULL DEFAULT '¡Gracias por visitarnos! Vuelve pronto.',
        min_amount_for_game NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE restaurant_ticket_config ADD COLUMN IF NOT EXISTS welcome_title TEXT;
      ALTER TABLE restaurant_ticket_config ADD COLUMN IF NOT EXISTS welcome_subtitle TEXT;
      ALTER TABLE restaurant_ticket_config ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#2563EB';
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_events (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id),
        name TEXT NOT NULL,
        description TEXT,
        event_type TEXT NOT NULL DEFAULT 'double_points',
        multiplier NUMERIC NOT NULL DEFAULT 2,
        max_participants INTEGER,
        participants_count INTEGER NOT NULL DEFAULT 0,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS stamp_cards (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        restaurant_id TEXT REFERENCES restaurants(id),
        stamps_count INTEGER NOT NULL DEFAULT 0,
        stamps_required INTEGER NOT NULL DEFAULT 5,
        completed_at TIMESTAMPTZ,
        prize_claimed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS prize_cost NUMERIC;
      ALTER TABLE customer_points ADD COLUMN IF NOT EXISTS birthday DATE;
      ALTER TABLE customer_points ADD COLUMN IF NOT EXISTS full_name TEXT;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS weekly_missions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        goal_type TEXT NOT NULL DEFAULT 'visits',
        goal_value INTEGER NOT NULL DEFAULT 3,
        reward_points INTEGER NOT NULL DEFAULT 50,
        restaurant_id TEXT REFERENCES restaurants(id),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS mission_progress (
        id TEXT PRIMARY KEY,
        mission_id TEXT NOT NULL REFERENCES weekly_missions(id) ON DELETE CASCADE,
        phone TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        completed_at TIMESTAMPTZ,
        reward_granted BOOLEAN NOT NULL DEFAULT FALSE,
        UNIQUE(mission_id, phone)
      );
    `);
    await client.query(`
      ALTER TABLE customer_points ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE customer_points ADD COLUMN IF NOT EXISTS streak_last_visit DATE;
      ALTER TABLE customer_points ADD COLUMN IF NOT EXISTS public_token TEXT;
      ALTER TABLE customer_points ADD COLUMN IF NOT EXISTS point_multiplier NUMERIC NOT NULL DEFAULT 1;
      ALTER TABLE customer_points ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS billing_plan TEXT DEFAULT 'free';
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'active';
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS billing_expires_at TIMESTAMPTZ;
      CREATE TABLE IF NOT EXISTS merch_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        photo_url TEXT,
        points_cost INTEGER NOT NULL,
        stock INTEGER,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        restaurant_id TEXT REFERENCES restaurants(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS merch_redemptions (
        id TEXT PRIMARY KEY,
        merch_item_id TEXT NOT NULL REFERENCES merch_items(id),
        phone TEXT NOT NULL,
        points_spent INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        redeemed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS outgoing_webhooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        events TEXT[] NOT NULL DEFAULT '{}',
        secret TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        last_triggered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS prize_rule_executions (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL REFERENCES prize_rules(id),
        phone TEXT NOT NULL,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(rule_id, phone)
      );
    `);
    await client.query(`
      -- ── Comando de Ventas: ventas diarias ──────────────────────────────
      CREATE TABLE IF NOT EXISTS daily_sales (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        sale_date DATE NOT NULL,
        cash_amount NUMERIC NOT NULL DEFAULT 0,
        card_amount NUMERIC NOT NULL DEFAULT 0,
        other_amount NUMERIC NOT NULL DEFAULT 0,
        total_amount NUMERIC NOT NULL DEFAULT 0,
        ticket_count INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS daily_sales_date_idx ON daily_sales(restaurant_id, sale_date);

      -- ── Inventario simple: entradas y salidas ──────────────────────────
      CREATE TABLE IF NOT EXISTS inventory_products (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'unidad',
        current_stock NUMERIC NOT NULL DEFAULT 0,
        min_stock_alert NUMERIC NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        note TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS inventory_movements_product_idx ON inventory_movements(product_id);

      -- ── Inventario por unidad: cada bulto/bolsa que llega tiene su propio
      -- peso real y su propio QR. Se retira entera de una sola vez (no se
      -- fracciona), descontando exactamente su peso del producto. ──────────
      CREATE TABLE IF NOT EXISTS inventory_units (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
        order_number TEXT NOT NULL,
        weight NUMERIC NOT NULL,
        status TEXT NOT NULL DEFAULT 'available',
        location TEXT,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        retired_at TIMESTAMPTZ,
        retired_by TEXT
      );
      CREATE INDEX IF NOT EXISTS inventory_units_product_idx ON inventory_units(product_id, status);
      ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS location TEXT;
      ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS unit_price NUMERIC;
      ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS expires_at DATE;
      CREATE INDEX IF NOT EXISTS inventory_units_expires_idx ON inventory_units(expires_at) WHERE status = 'available';
      ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS code TEXT;
      ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS sale_price NUMERIC;

      -- ── Punto de venta (TPV): pantalla ligada a inventario — al cobrar un
      -- artículo se descuenta el stock automáticamente, para que el
      -- inventario y las ventas siempre cuadren entre sí. ─────────────────
      CREATE TABLE IF NOT EXISTS pos_sales (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        employee_id TEXT REFERENCES employees(id),
        employee_name TEXT,
        total_amount NUMERIC NOT NULL DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'efectivo',
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS pos_sale_items (
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL REFERENCES pos_sales(id),
        product_id TEXT NOT NULL REFERENCES inventory_products(id),
        product_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        quantity NUMERIC NOT NULL,
        unit_price NUMERIC NOT NULL,
        subtotal NUMERIC NOT NULL
      );
      CREATE INDEX IF NOT EXISTS pos_sale_items_sale_idx ON pos_sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS pos_sales_created_idx ON pos_sales(created_at);
      ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pendiente';
      ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS status_updated_by TEXT;
      ALTER TABLE pos_sales ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
      CREATE INDEX IF NOT EXISTS pos_sales_status_idx ON pos_sales(status);

      -- ── Proveedores: cada producto de inventario pertenece a un proveedor,
      -- así cada proveedor tiene su propio "perfil" con los productos que
      -- provee. ──────────────────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        name TEXT NOT NULL,
        contact_name TEXT,
        contact_phone TEXT,
        contact_email TEXT,
        notes TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE inventory_products ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES suppliers(id);
      CREATE INDEX IF NOT EXISTS inventory_products_supplier_idx ON inventory_products(supplier_id);

      -- ── Mensajes programados (broadcast a clientes en fecha futura) ────
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        target_type TEXT NOT NULL DEFAULT 'all',
        inactive_days INTEGER,
        channels TEXT[] NOT NULL DEFAULT ARRAY['push','email'],
        send_at TIMESTAMPTZ NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        sent_count INTEGER,
        error TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sent_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS scheduled_messages_due_idx ON scheduled_messages(status, send_at);

      -- ── Empleados + fichajes (PIN-based clock in/out) ──────────────────
      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        full_name TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        position TEXT,
        photo_url TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        total_training_points INTEGER NOT NULL DEFAULT 0,
        hourly_rate NUMERIC,
        scheduled_hours_per_day NUMERIC,
        scheduled_start_time TIME,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS scheduled_hours_per_day NUMERIC;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS scheduled_start_time TIME;
      CREATE TABLE IF NOT EXISTS time_clock_entries (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        clock_in TIMESTAMPTZ NOT NULL,
        clock_out TIMESTAMPTZ,
        clock_in_lat NUMERIC,
        clock_in_lng NUMERIC,
        clock_out_lat NUMERIC,
        clock_out_lng NUMERIC,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS time_clock_employee_idx ON time_clock_entries(employee_id);
      ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS clock_in_lat NUMERIC;
      ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS clock_in_lng NUMERIC;
      ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS clock_out_lat NUMERIC;
      ALTER TABLE time_clock_entries ADD COLUMN IF NOT EXISTS clock_out_lng NUMERIC;

      -- ── Capacitación gamificada (quiz con puntos) ──────────────────────
      CREATE TABLE IF NOT EXISTS training_modules (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT '📚',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS training_questions (
        id TEXT PRIMARY KEY,
        module_id TEXT NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        options JSONB NOT NULL,
        correct_index INTEGER NOT NULL,
        points INTEGER NOT NULL DEFAULT 10,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS training_attempts (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        module_id TEXT NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
        score INTEGER NOT NULL DEFAULT 0,
        total_points INTEGER NOT NULL DEFAULT 0,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS training_attempts_employee_idx ON training_attempts(employee_id);
    `);
    await client.query(`
      -- ── Índices adicionales para consultas frecuentes ──────────────────
      CREATE INDEX IF NOT EXISTS claims_phone_idx ON claims(phone);
      CREATE INDEX IF NOT EXISTS claims_prize_id_idx ON claims(prize_id);
      CREATE INDEX IF NOT EXISTS claims_claimed_at_idx ON claims(claimed_at);
      CREATE INDEX IF NOT EXISTS prizes_restaurant_id_idx ON prizes(restaurant_id);
      CREATE INDEX IF NOT EXISTS inventory_products_restaurant_id_idx ON inventory_products(restaurant_id);
    `);
    await client.query(`
      -- ── IA generativa: log/caché de generaciones (mensajes, recomendaciones) ──
      CREATE TABLE IF NOT EXISTS ai_generations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        phone TEXT,
        input_summary TEXT,
        output TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS ai_generations_phone_idx ON ai_generations(phone);

      -- ── Moneda social: regalo de puntos entre clientes ─────────────────
      CREATE TABLE IF NOT EXISTS point_transfers (
        id TEXT PRIMARY KEY,
        from_phone TEXT NOT NULL,
        to_phone TEXT NOT NULL,
        points INTEGER NOT NULL,
        message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS point_transfers_from_idx ON point_transfers(from_phone);
      CREATE INDEX IF NOT EXISTS point_transfers_to_idx ON point_transfers(to_phone);

      -- ── Notas de preferencias del cliente: lo que el personal anota en
      -- cada visita (qué pidió, gustos, alergias, etc.) para dar un trato
      -- personalizado y agilizar pedidos futuros. ────────────────────────
      CREATE TABLE IF NOT EXISTS customer_notes (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        note TEXT NOT NULL,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS customer_notes_phone_idx ON customer_notes(phone);

      -- ── Battle pass / temporadas gamificadas ───────────────────────────
      CREATE TABLE IF NOT EXISTS seasons (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        restaurant_id TEXT REFERENCES restaurants(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS season_tiers (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
        level INTEGER NOT NULL,
        points_required INTEGER NOT NULL,
        reward_name TEXT NOT NULL,
        reward_description TEXT,
        UNIQUE(season_id, level)
      );
      CREATE TABLE IF NOT EXISTS season_progress (
        id TEXT PRIMARY KEY,
        season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
        phone TEXT NOT NULL,
        season_points INTEGER NOT NULL DEFAULT 0,
        claimed_levels INTEGER[] NOT NULL DEFAULT '{}',
        UNIQUE(season_id, phone)
      );
      CREATE INDEX IF NOT EXISTS season_progress_phone_idx ON season_progress(phone);

      -- ── Eventos dinámicos por clima/contexto (dedupe diario) ───────────
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS lat NUMERIC;
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS lng NUMERIC;
      CREATE TABLE IF NOT EXISTS dynamic_event_log (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id),
        trigger_type TEXT NOT NULL,
        event_id TEXT REFERENCES restaurant_events(id),
        triggered_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(restaurant_id, trigger_type, triggered_date)
      );
    `);
    await client.query(`
      -- ── Chat con tus datos (IA): historial de conversación por admin ───
      CREATE TABLE IF NOT EXISTS ai_chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        username TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS ai_chat_messages_session_idx ON ai_chat_messages(session_id);

      -- ── Detector de fraude ──────────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS fraud_alerts (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        phone TEXT,
        restaurant_id TEXT REFERENCES restaurants(id),
        description TEXT NOT NULL,
        metadata JSONB,
        resolved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS fraud_alerts_resolved_idx ON fraud_alerts(resolved);
      ALTER TABLE claims ADD COLUMN IF NOT EXISTS ip_address TEXT;

      -- ── Tarjeta de cliente generada por IA ──────────────────────────────
      CREATE TABLE IF NOT EXISTS ai_customer_cards (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        image_url TEXT NOT NULL,
        prompt_used TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS ai_customer_cards_phone_idx ON ai_customer_cards(phone);
    `);
    schemaInitialized = true;
  } finally {
    client.release();
  }
}

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  logo_url: string | null;
  accent_color: string;
  google_maps_url: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export type RestaurantStats = {
  total_prizes: number;
  total_claims: number;
  delivered: number;
  pending: number;
};

export type Campaign = {
  id: string;
  name: string;
  description: string | null;
  restaurant_id: string | null;
  created_at: string;
  qr_dot_color: string;
  qr_background: string;
  qr_dot_style: string;
  qr_corner_style: string;
  qr_gradient_end: string | null;
  prize_cost: number | null;
};

export type Prize = {
  id: string;
  name: string;
  reason: string;
  start_date: string;
  end_date: string;
  description: string;
  location: string; // comma-separated list of branches
  restaurant_id: string | null;
  cancelled: boolean;
  created_at: string;
  generated_by?: string | null;
  max_uses: number;
  photo_url?: string | null;
  campaign_id?: string | null;
  stock_limit?: number | null;
  valid_hours?: string | null;   // "HH:MM-HH:MM" or null
  valid_days?: string | null;    // "1,2,3,4,5" (Mon=1…Sun=7) or null
  activate_at?: string | null;   // ISO timestamp or null
  game_type?: string | null;     // 'slots' | 'roulette' | 'penalty' | 'scratch' | null
};

export type PrizeWithRestaurant = Prize & {
  restaurant_name: string | null;
  claim_count: number;
};

export type ActivityLogEntry = {
  id: string;
  restaurant_id: string | null;
  action: string;
  description: string;
  user_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type DbUser = {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'manager' | 'cajero';
  restaurant_id: string | null;
  created_at: string;
};

export type Claim = {
  id: string;
  prize_id: string;
  full_name: string;
  phone: string;
  email: string;
  location: string | null; // branch chosen by customer
  claimed_at: string;
  status: 'pending' | 'delivered';
  delivered_at: string | null;
  delivered_by: string | null;
  referral_code: string | null;
  referred_by: string | null;
  expires_at?: string | null;
  points_earned?: number;
  ip_address?: string | null;
};

export type ClaimWithPrize = Claim & {
  prize_name: string;
  prize_location: string;   // all available branches (from prize)
  prize_description: string;
  restaurant_name: string | null;
};

export type CustomerPoints = {
  id: string;
  phone: string;
  email: string;
  total_points: number;
  lifetime_points: number;
  tier: 'bronze' | 'silver' | 'gold';
  updated_at: string;
};

export type CustomerTier = 'bronze' | 'silver' | 'gold';

export const TIER_THRESHOLDS: Record<'silver' | 'gold', number> = {
  silver: 100,
  gold: 300,
};

export const TIER_BENEFITS: Record<CustomerTier, string[]> = {
  bronze: [
    'Acumula puntos en cada visita',
    'Acceso a promociones generales',
  ],
  silver: [
    'Acceso anticipado a promociones y campañas',
    'Regalo de cumpleaños mejorado',
    'Soporte prioritario',
  ],
  gold: [
    'Premios y eventos exclusivos VIP',
    'Atención prioritaria en sucursal',
    'Regalo de cumpleaños premium',
    'Invitaciones a eventos especiales',
  ],
};

export const TIER_LABELS: Record<CustomerTier, string> = {
  bronze: 'Bronce',
  silver: 'Plata',
  gold: 'Oro',
};

export function getTierForPoints(totalPoints: number): CustomerTier {
  if (totalPoints >= TIER_THRESHOLDS.gold) return 'gold';
  if (totalPoints >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
}

export type TierInfo = {
  tier: CustomerTier;
  next: CustomerTier | null;
  nextThreshold: number | null;
  pointsToNext: number;
  progressPct: number;
  benefits: string[];
};

export function getTierInfo(totalPoints: number): TierInfo {
  const tier = getTierForPoints(totalPoints);
  const next: CustomerTier | null = tier === 'gold' ? null : tier === 'silver' ? 'gold' : 'silver';
  const nextThreshold = next ? TIER_THRESHOLDS[next] : null;
  const prevThreshold = tier === 'gold' ? TIER_THRESHOLDS.gold : tier === 'silver' ? TIER_THRESHOLDS.silver : 0;
  const pointsToNext = nextThreshold ? Math.max(0, nextThreshold - totalPoints) : 0;
  const progressPct = nextThreshold
    ? Math.min(100, Math.max(0, Math.round(((totalPoints - prevThreshold) / (nextThreshold - prevThreshold)) * 100)))
    : 100;
  return { tier, next, nextThreshold, pointsToNext, progressPct, benefits: TIER_BENEFITS[tier] };
}

export async function insertRestaurant(r: Omit<Restaurant, 'created_at'>): Promise<Restaurant> {
  await ensureSchema();
  const { rows } = await getPool().query<Restaurant>(
    `INSERT INTO restaurants (id, name, address, phone, accent_color, google_maps_url) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [r.id, r.name, r.address, r.phone ?? null, r.accent_color ?? '#2563EB', r.google_maps_url ?? null]
  );
  return rows[0];
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  await ensureSchema();
  const { rows } = await getPool().query<Restaurant>('SELECT * FROM restaurants ORDER BY created_at DESC');
  return rows;
}

export async function getRestaurantById(id: string): Promise<Restaurant | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Restaurant>('SELECT * FROM restaurants WHERE id = $1', [id]);
  return rows[0];
}

export async function getRestaurantStats(restaurantId: string): Promise<RestaurantStats> {
  await ensureSchema();
  const { rows } = await getPool().query<{ total_prizes: string; total_claims: string; delivered: string; pending: string }>(`
    SELECT
      COUNT(DISTINCT p.id)::text AS total_prizes,
      COUNT(c.id)::text AS total_claims,
      COUNT(c.id) FILTER (WHERE c.status = 'delivered')::text AS delivered,
      COUNT(c.id) FILTER (WHERE c.status = 'pending')::text AS pending
    FROM prizes p
    LEFT JOIN claims c ON c.prize_id = p.id
    WHERE p.restaurant_id = $1
  `, [restaurantId]);
  const r = rows[0];
  return {
    total_prizes: parseInt(r.total_prizes, 10),
    total_claims: parseInt(r.total_claims, 10),
    delivered: parseInt(r.delivered, 10),
    pending: parseInt(r.pending, 10),
  };
}

export async function getClaimsByRestaurant(restaurantId: string): Promise<ClaimWithPrize[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ClaimWithPrize>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location, p.description AS prize_description,
           r.name AS restaurant_name
    FROM claims c JOIN prizes p ON c.prize_id = p.id
    LEFT JOIN restaurants r ON r.id = p.restaurant_id
    WHERE p.restaurant_id = $1
    ORDER BY c.claimed_at DESC
  `, [restaurantId]);
  return rows;
}

export async function insertPrize(prize: Omit<Prize, 'created_at'>): Promise<Prize> {
  await ensureSchema();
  const { rows } = await getPool().query<Prize>(
    `INSERT INTO prizes (id, name, reason, start_date, end_date, description, location, restaurant_id, generated_by, max_uses, photo_url, campaign_id, stock_limit, valid_hours, valid_days, activate_at, game_type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [prize.id, prize.name, prize.reason, prize.start_date, prize.end_date, prize.description, prize.location, prize.restaurant_id ?? null, prize.generated_by ?? null, prize.max_uses ?? 1, prize.photo_url ?? null, prize.campaign_id ?? null, prize.stock_limit ?? null, prize.valid_hours ?? null, prize.valid_days ?? null, prize.activate_at ?? null, prize.game_type ?? null]
  );
  return rows[0];
}

export async function getPrizeById(id: string): Promise<Prize | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Prize>('SELECT * FROM prizes WHERE id = $1', [id]);
  return rows[0];
}

export async function getPrizeClaimCount(prizeId: string): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ count: string }>(
    'SELECT COUNT(*) as count FROM claims WHERE prize_id = $1', [prizeId]
  );
  return parseInt(rows[0].count, 10);
}

export function calcProportionalPoints(amount: number | null | undefined, minimum = 5): number {
  if (!amount || amount <= 0) return minimum;
  return Math.max(minimum, Math.floor(amount / 10));
}

export async function insertClaim(
  claim: Omit<Claim, 'claimed_at' | 'status' | 'delivered_at' | 'delivered_by'> & { ticket_amount?: number | null }
): Promise<Claim> {
  await ensureSchema();
  const points = calcProportionalPoints(claim.ticket_amount ?? null, 10);
  const { rows } = await getPool().query<Claim>(
    `INSERT INTO claims (id, prize_id, full_name, phone, email, location, referral_code, referred_by, expires_at, points_earned, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW() + INTERVAL '2 hours', $9, $10) RETURNING *`,
    [claim.id, claim.prize_id, claim.full_name, claim.phone, claim.email, claim.location ?? null, claim.referral_code ?? null, claim.referred_by ?? null, points, claim.ip_address ?? null]
  );
  // Award points non-blocking
  upsertCustomerPoints(claim.phone, claim.email, points).catch(() => {});
  return rows[0];
}

export async function upsertCustomerPoints(phone: string, email: string, pointsDelta: number): Promise<CustomerPoints> {
  await ensureSchema();

  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replace(/-/g, '');
  const today = new Date().toISOString().slice(0, 10);

  // Insert or update, tracking streaks and generating public_token if missing
  await getPool().query(
    `INSERT INTO customer_points (id, phone, email, total_points, lifetime_points, tier, public_token,
        streak_days, streak_last_visit, updated_at)
     VALUES ($1, $2, $3, $4, $4, 'bronze', $5, 1, $6::date, NOW())
     ON CONFLICT (phone) DO UPDATE SET
       email = EXCLUDED.email,
       total_points = customer_points.total_points + $4,
       lifetime_points = customer_points.lifetime_points + $4,
       public_token = COALESCE(customer_points.public_token, $5),
       streak_days = CASE
         WHEN customer_points.streak_last_visit = $6::date - INTERVAL '1 day' THEN customer_points.streak_days + 1
         WHEN customer_points.streak_last_visit = $6::date THEN customer_points.streak_days
         ELSE 1
       END,
       streak_last_visit = $6::date,
       updated_at = NOW()`,
    [id, phone, email, pointsDelta, token, today]
  );
  const { rows: before } = await getPool().query<{ tier: string }>(
    'SELECT tier FROM customer_points WHERE phone = $1', [phone]
  );
  const prevTier = before[0]?.tier ?? 'bronze';

  const { rows } = await getPool().query<CustomerPoints>(
    `UPDATE customer_points
     SET tier = CASE
       WHEN total_points >= 300 THEN 'gold'
       WHEN total_points >= 100 THEN 'silver'
       ELSE 'bronze'
     END
     WHERE phone = $1
     RETURNING *`,
    [phone]
  );
  const cp = rows[0];

  // Fire webhook if tier changed (non-blocking)
  if (cp && cp.tier !== prevTier) {
    import('@/lib/dispatchWebhook').then(({ dispatchWebhook }) => {
      const event = cp.tier > prevTier ? 'tier_upgrade' : 'tier_downgrade';
      dispatchWebhook(event, { phone, prev_tier: prevTier, new_tier: cp.tier, total_points: cp.total_points });
    }).catch(() => {});
  }

  return cp;
}

export async function getCustomerPoints(phone: string): Promise<CustomerPoints | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<CustomerPoints>(
    `SELECT * FROM customer_points WHERE phone = $1`,
    [phone]
  );
  return rows[0];
}

export async function getAllCustomerPoints(): Promise<CustomerPoints[]> {
  await ensureSchema();
  const { rows } = await getPool().query<CustomerPoints>(
    `SELECT * FROM customer_points ORDER BY lifetime_points DESC`
  );
  return rows;
}

export type AnalyticsOverview = {
  ltv: {
    avgLifetimeValue: number;
    totalRevenue: number;
    payingCustomers: number;
    topCustomers: Array<{ phone: string; full_name: string; total_spent: number; visits: number; last_visit: string }>;
  };
  retention: {
    totalCustomers: number;
    returningCustomers: number;
    retentionRate: number;
    newCustomers30d: number;
    activeCustomers30d: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    prizesGenerated: number;
    claims: number;
    delivered: number;
    conversionRate: number;
    uniqueCustomers: number;
    prizeCost: number | null;
    totalCost: number | null;
    costPerClaim: number | null;
  }>;
  winback: {
    at_risk: number;
    dormant: number;
  };
};

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  await ensureSchema();
  const pool = getPool();

  // All queries run in parallel — avoids 5× sequential round-trips
  const [ltvResult, topCustomerResult, retentionResult, campaignResult, winbackResult] = await Promise.all([
    pool.query<{ total_revenue: string; paying_customers: string }>(`
      SELECT COALESCE(SUM(amount), 0)::text AS total_revenue, COUNT(DISTINCT phone)::text AS paying_customers
      FROM ticket_claims
    `),
    pool.query<{ phone: string; full_name: string; total_spent: string; visits: string; last_visit: string }>(`
      SELECT phone, full_name, SUM(amount)::text AS total_spent, COUNT(*)::text AS visits, MAX(claimed_at)::text AS last_visit
      FROM ticket_claims
      GROUP BY phone, full_name
      ORDER BY SUM(amount) DESC
      LIMIT 10
    `),
    // Single query computes all retention metrics in SQL — no full table transfer to Node
    pool.query<{ total: string; returning: string; new_30d: string; active_30d: string }>(`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE visits >= 2)::text AS returning,
        COUNT(*) FILTER (WHERE first_visit >= NOW() - INTERVAL '30 days')::text AS new_30d,
        COUNT(*) FILTER (WHERE last_visit >= NOW() - INTERVAL '30 days')::text AS active_30d
      FROM (
        SELECT phone, COUNT(*) AS visits, MIN(claimed_at) AS first_visit, MAX(claimed_at) AS last_visit
        FROM (
          SELECT phone, claimed_at FROM claims
          UNION ALL
          SELECT phone, claimed_at FROM ticket_claims
        ) all_activity
        GROUP BY phone
      ) g
    `),
    pool.query<{ id: string; name: string; prizes_generated: string; claims: string; delivered: string; unique_customers: string; prize_cost: string | null }>(`
      SELECT
        camp.id,
        camp.name,
        camp.prize_cost::text AS prize_cost,
        COUNT(DISTINCT p.id)::text AS prizes_generated,
        COUNT(c.id)::text AS claims,
        COUNT(c.id) FILTER (WHERE c.status = 'delivered')::text AS delivered,
        COUNT(DISTINCT c.phone)::text AS unique_customers
      FROM campaigns camp
      LEFT JOIN prizes p ON p.campaign_id = camp.id
      LEFT JOIN claims c ON c.prize_id = p.id
      GROUP BY camp.id, camp.name, camp.prize_cost
      ORDER BY COUNT(c.id) DESC
    `),
    pool.query<{ at_risk: string; dormant: string }>(`
      SELECT
        COUNT(*) FILTER (WHERE last_visit < NOW() - INTERVAL '30 days')::text AS at_risk,
        COUNT(*) FILTER (WHERE last_visit >= NOW() - INTERVAL '30 days' AND last_visit < NOW() - INTERVAL '15 days')::text AS dormant
      FROM (
        SELECT phone, MAX(claimed_at) AS last_visit
        FROM (
          SELECT phone, claimed_at FROM claims
          UNION ALL
          SELECT phone, claimed_at FROM ticket_claims
        ) a
        GROUP BY phone
      ) g
    `),
  ]);

  const totalRevenue = parseFloat(ltvResult.rows[0]?.total_revenue ?? '0');
  const payingCustomers = parseInt(ltvResult.rows[0]?.paying_customers ?? '0', 10);
  const ret = retentionResult.rows[0];
  const totalCustomers = parseInt(ret?.total ?? '0', 10);
  const returningCustomers = parseInt(ret?.returning ?? '0', 10);

  return {
    ltv: {
      avgLifetimeValue: payingCustomers > 0 ? totalRevenue / payingCustomers : 0,
      totalRevenue,
      payingCustomers,
      topCustomers: topCustomerResult.rows.map((r) => ({
        phone: r.phone,
        full_name: r.full_name,
        total_spent: parseFloat(r.total_spent),
        visits: parseInt(r.visits, 10),
        last_visit: r.last_visit,
      })),
    },
    retention: {
      totalCustomers,
      returningCustomers,
      retentionRate: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0,
      newCustomers30d: parseInt(ret?.new_30d ?? '0', 10),
      activeCustomers30d: parseInt(ret?.active_30d ?? '0', 10),
    },
    campaigns: campaignResult.rows.map((r) => {
      const claims = parseInt(r.claims, 10);
      const prizesGenerated = parseInt(r.prizes_generated, 10);
      const prizeCost = r.prize_cost != null ? parseFloat(r.prize_cost) : null;
      const totalCost = prizeCost != null ? prizeCost * claims : null;
      return {
        id: r.id,
        name: r.name,
        prizesGenerated,
        claims,
        delivered: parseInt(r.delivered, 10),
        conversionRate: prizesGenerated > 0 ? (claims / prizesGenerated) * 100 : 0,
        uniqueCustomers: parseInt(r.unique_customers, 10),
        prizeCost,
        totalCost,
        costPerClaim: claims > 0 && totalCost != null ? totalCost / claims : null,
      };
    }),
    winback: {
      at_risk: parseInt(winbackResult.rows[0]?.at_risk ?? '0', 10),
      dormant: parseInt(winbackResult.rows[0]?.dormant ?? '0', 10),
    },
  };
}

export async function getReferralStats(): Promise<{
  total_referrals: number;
  top_referrers: Array<{ referral_code: string; full_name: string; count: number }>;
  chains: Array<{ referrer_name: string; referral_code: string; referred_name: string; referred_at: string }>;
}> {
  await ensureSchema();
  const { rows: totalRows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) as count FROM claims WHERE referred_by IS NOT NULL`
  );
  const { rows: topRows } = await getPool().query<{ referral_code: string; full_name: string; count: string }>(
    `SELECT c.referral_code, c.full_name, COUNT(r.id)::text as count
     FROM claims c
     JOIN claims r ON r.referred_by = c.referral_code
     GROUP BY c.referral_code, c.full_name
     ORDER BY count DESC
     LIMIT 10`
  );
  const { rows: chainRows } = await getPool().query<{ referrer_name: string; referral_code: string; referred_name: string; referred_at: string }>(
    `SELECT c.full_name as referrer_name, c.referral_code, r.full_name as referred_name, r.claimed_at as referred_at
     FROM claims r
     JOIN claims c ON c.referral_code = r.referred_by
     ORDER BY r.claimed_at DESC
     LIMIT 50`
  );
  return {
    total_referrals: parseInt(totalRows[0].count, 10),
    top_referrers: topRows.map(r => ({ ...r, count: parseInt(r.count, 10) })),
    chains: chainRows,
  };
}

export async function getReferralCount(code: string): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) as count FROM claims WHERE referred_by = $1`,
    [code]
  );
  return parseInt(rows[0].count, 10);
}

export async function getClaimById(id: string): Promise<ClaimWithPrize | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<ClaimWithPrize>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location, p.description AS prize_description,
           p.reason, p.start_date, p.end_date, r.name AS restaurant_name
    FROM claims c JOIN prizes p ON c.prize_id = p.id
    LEFT JOIN restaurants r ON r.id = p.restaurant_id
    WHERE c.id = $1
  `, [id]);
  return rows[0];
}

export async function deliverClaim(id: string, deliveredBy: string): Promise<Claim | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Claim>(
    `UPDATE claims SET status = 'delivered', delivered_at = NOW(), delivered_by = $2
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id, deliveredBy]
  );
  return rows[0];
}

export async function getAllClaims(
  status?: 'pending' | 'delivered',
  since?: string,
  opts?: { offset?: number; limit?: number; restaurantId?: string },
): Promise<ClaimWithPrize[]> {
  await ensureSchema();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (status) { conditions.push(`c.status = $${i++}`); params.push(status); }
  if (since) { conditions.push(`c.claimed_at > $${i++}`); params.push(since); }
  if (opts?.restaurantId) { conditions.push(`p.restaurant_id = $${i++}`); params.push(opts.restaurantId); }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = opts?.limit != null ? `LIMIT $${i++}` : '';
  if (opts?.limit != null) params.push(opts.limit);
  const offsetClause = opts?.offset != null ? `OFFSET $${i++}` : '';
  if (opts?.offset != null) params.push(opts.offset);
  const { rows } = await getPool().query<ClaimWithPrize>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location, p.description AS prize_description,
           r.name AS restaurant_name
    FROM claims c
    JOIN prizes p ON c.prize_id = p.id
    LEFT JOIN restaurants r ON r.id = p.restaurant_id
    ${where}
    ORDER BY c.claimed_at DESC
    ${limitClause}
    ${offsetClause}
  `, params);
  return rows;
}

export async function getAllPrizes(): Promise<PrizeWithRestaurant[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PrizeWithRestaurant>(`
    SELECT p.*, r.name AS restaurant_name,
           (SELECT COUNT(*) FROM claims c WHERE c.prize_id = p.id)::int AS claim_count
    FROM prizes p
    LEFT JOIN restaurants r ON r.id = p.restaurant_id
    ORDER BY p.created_at DESC
  `);
  return rows;
}

export async function getExpiringPrizes(days: number): Promise<Array<{ id: string; name: string; end_date: string; claim_count: number }>> {
  await ensureSchema();
  const { rows } = await getPool().query<{ id: string; name: string; end_date: string; claim_count: number }>(
    `SELECT p.id, p.name, p.end_date,
            (SELECT COUNT(*) FROM claims c WHERE c.prize_id = p.id)::int AS claim_count
     FROM prizes p
     WHERE p.cancelled = FALSE
       AND p.end_date::date >= CURRENT_DATE
       AND p.end_date::date <= CURRENT_DATE + ($1 || ' days')::INTERVAL
       AND (SELECT COUNT(*) FROM claims c WHERE c.prize_id = p.id) = 0
     ORDER BY p.end_date ASC`,
    [days]
  );
  return rows;
}

export async function cancelPrize(id: string): Promise<Prize | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Prize>(
    `UPDATE prizes SET cancelled = TRUE WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

export async function updateRestaurant(id: string, fields: { name?: string; address?: string; phone?: string | null; logo_url?: string | null; google_maps_url?: string | null; lat?: number | null; lng?: number | null }): Promise<Restaurant | undefined> {
  await ensureSchema();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (fields.name !== undefined) { sets.push(`name = $${i++}`); vals.push(fields.name); }
  if (fields.address !== undefined) { sets.push(`address = $${i++}`); vals.push(fields.address); }
  if (fields.phone !== undefined) { sets.push(`phone = $${i++}`); vals.push(fields.phone); }
  if (fields.logo_url !== undefined) { sets.push(`logo_url = $${i++}`); vals.push(fields.logo_url); }
  if (fields.google_maps_url !== undefined) { sets.push(`google_maps_url = $${i++}`); vals.push(fields.google_maps_url); }
  if (fields.lat !== undefined) { sets.push(`lat = $${i++}`); vals.push(fields.lat); }
  if (fields.lng !== undefined) { sets.push(`lng = $${i++}`); vals.push(fields.lng); }
  if (sets.length === 0) return getRestaurantById(id);
  vals.push(id);
  const { rows } = await getPool().query<Restaurant>(
    `UPDATE restaurants SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  return rows[0];
}

export type CashierPerformance = {
  delivered_by: string;
  count: number;
  avg_delivery_time_hours: number | null;
  last_delivery: string | null;
};

export async function getCashierPerformance(
  restaurantId: string,
  range: 'today' | 'week' | 'month' = 'week'
): Promise<CashierPerformance[]> {
  await ensureSchema();
  const interval = range === 'today' ? '1 day' : range === 'week' ? '7 days' : '30 days';
  const { rows } = await getPool().query<{
    delivered_by: string;
    count: string;
    avg_delivery_time_hours: string | null;
    last_delivery: string | null;
  }>(
    `SELECT
       c.delivered_by,
       COUNT(*)::text AS count,
       AVG(EXTRACT(EPOCH FROM (c.delivered_at - c.claimed_at)) / 3600)::text AS avg_delivery_time_hours,
       MAX(c.delivered_at)::text AS last_delivery
     FROM claims c
     JOIN prizes p ON p.id = c.prize_id
     WHERE p.restaurant_id = $1
       AND c.status = 'delivered'
       AND c.delivered_by IS NOT NULL
       AND c.delivered_at >= NOW() - ($2 || ' days')::INTERVAL
     GROUP BY c.delivered_by
     ORDER BY COUNT(*) DESC`,
    [restaurantId, range === 'today' ? 1 : range === 'week' ? 7 : 30]
  );
  return rows.map((r) => ({
    delivered_by: r.delivered_by,
    count: parseInt(r.count, 10),
    avg_delivery_time_hours: r.avg_delivery_time_hours ? parseFloat(r.avg_delivery_time_hours) : null,
    last_delivery: r.last_delivery ?? null,
  }));
}

export async function logActivity(entry: Omit<ActivityLogEntry, 'created_at'>): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO activity_log (id, restaurant_id, action, description, user_name, metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [entry.id, entry.restaurant_id ?? null, entry.action, entry.description, entry.user_name ?? null, entry.metadata ? JSON.stringify(entry.metadata) : null]
  );
}

export async function getFeedbackStats(): Promise<{ avg_rating: number; total: number; entries: Array<{ claim_id: string; rating: number; comment: string | null; created_at: string }> }> {
  await ensureSchema();
  const { rows } = await getPool().query<{ metadata: Record<string, unknown>; created_at: string }>(
    `SELECT metadata, created_at FROM activity_log WHERE action = 'feedback' AND metadata->>'rating' IS NOT NULL ORDER BY created_at DESC`
  );
  const entries = rows.map((r) => ({
    claim_id: String(r.metadata.claim_id ?? ''),
    rating: Number(r.metadata.rating),
    comment: r.metadata.comment != null ? String(r.metadata.comment) : null,
    created_at: r.created_at,
  }));
  const total = entries.length;
  const avg_rating = total > 0 ? Math.round((entries.reduce((s, e) => s + e.rating, 0) / total) * 10) / 10 : 0;
  return { avg_rating, total, entries };
}

export async function getRestaurantActivity(restaurantId: string, limit = 20): Promise<ActivityLogEntry[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ActivityLogEntry>(
    `SELECT * FROM activity_log WHERE restaurant_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [restaurantId, limit]
  );
  return rows;
}

export async function createUser(u: Omit<DbUser, 'created_at'>): Promise<DbUser> {
  await ensureSchema();
  const { rows } = await getPool().query<DbUser>(
    `INSERT INTO users (id, username, password_hash, role, restaurant_id) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [u.id, u.username, u.password_hash, u.role, u.restaurant_id ?? null]
  );
  return rows[0];
}

export async function getUserByUsername(username: string): Promise<DbUser | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<DbUser>('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0];
}

export async function insertCampaign(c: Omit<Campaign, 'created_at'>): Promise<Campaign> {
  await ensureSchema();
  const { rows } = await getPool().query<Campaign>(
    `INSERT INTO campaigns (id, name, description, restaurant_id, qr_dot_color, qr_background, qr_dot_style, qr_corner_style, qr_gradient_end, prize_cost)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [c.id, c.name, c.description ?? null, c.restaurant_id ?? null,
     c.qr_dot_color ?? '#0f172a', c.qr_background ?? '#ffffff',
     c.qr_dot_style ?? 'square', c.qr_corner_style ?? 'square', c.qr_gradient_end ?? null,
     c.prize_cost ?? null]
  );
  return rows[0];
}

export async function getAllCampaigns(restaurantId?: string): Promise<Campaign[]> {
  await ensureSchema();
  if (restaurantId) {
    const { rows } = await getPool().query<Campaign>(
      'SELECT * FROM campaigns WHERE restaurant_id = $1 ORDER BY created_at DESC',
      [restaurantId]
    );
    return rows;
  }
  const { rows } = await getPool().query<Campaign>('SELECT * FROM campaigns ORDER BY created_at DESC');
  return rows;
}

export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<Campaign>('SELECT * FROM campaigns WHERE id = $1', [id]);
  return rows[0];
}

export async function updateCampaign(id: string, fields: Partial<Omit<Campaign, 'id' | 'created_at'>>): Promise<Campaign | undefined> {
  await ensureSchema();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  const allowed: Array<keyof typeof fields> = ['name', 'description', 'restaurant_id', 'qr_dot_color', 'qr_background', 'qr_dot_style', 'qr_corner_style', 'qr_gradient_end'];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(fields[key] ?? null);
    }
  }
  if (sets.length === 0) return getCampaignById(id);
  vals.push(id);
  const { rows } = await getPool().query<Campaign>(
    `UPDATE campaigns SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  return rows[0];
}

export async function deleteCampaign(id: string): Promise<void> {
  await ensureSchema();
  await getPool().query('DELETE FROM campaigns WHERE id = $1', [id]);
}

export async function getClaimsByContact(
  phoneOrEmail: string
): Promise<(ClaimWithPrize & { start_date: string; end_date: string })[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ClaimWithPrize & { start_date: string; end_date: string }>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location, p.description AS prize_description,
           p.start_date, p.end_date, r.name AS restaurant_name
    FROM claims c JOIN prizes p ON c.prize_id = p.id
    LEFT JOIN restaurants r ON r.id = p.restaurant_id
    WHERE c.phone = $1 OR c.email = $1
    ORDER BY c.claimed_at DESC
  `, [phoneOrEmail]);
  return rows;
}

export async function getRecentClaimsByContact(
  phoneOrEmail: string,
  days = 30
): Promise<ClaimWithPrize[]> {
  await ensureSchema();
  const { rows } = await getPool().query<ClaimWithPrize>(`
    SELECT c.*, p.name AS prize_name, p.location AS prize_location, p.description AS prize_description,
           r.name AS restaurant_name
    FROM claims c JOIN prizes p ON c.prize_id = p.id
    LEFT JOIN restaurants r ON r.id = p.restaurant_id
    WHERE (c.phone = $1 OR c.email = $1)
      AND c.claimed_at >= NOW() - ($2 || ' days')::INTERVAL
    ORDER BY c.claimed_at DESC
  `, [phoneOrEmail, days]);
  return rows;
}

// ── Prize Rules ──────────────────────────────────────────────────────────────

export type PrizeRule = {
  id: string;
  name: string;
  trigger_type: 'nth_claim' | 'birthday' | 'points_milestone';
  trigger_value: number;
  prize_template: string;
  prize_reason: string;
  prize_description: string;
  validity_days: number;
  restaurant_id: string | null;
  active: boolean;
  created_at: string;
};

export async function insertPrizeRule(rule: Omit<PrizeRule, 'created_at'>): Promise<PrizeRule> {
  await ensureSchema();
  const { rows } = await getPool().query<PrizeRule>(
    `INSERT INTO prize_rules (id, name, trigger_type, trigger_value, prize_template, prize_reason, prize_description, validity_days, restaurant_id, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [rule.id, rule.name, rule.trigger_type, rule.trigger_value, rule.prize_template, rule.prize_reason, rule.prize_description, rule.validity_days, rule.restaurant_id ?? null, rule.active]
  );
  return rows[0];
}

export async function getAllPrizeRules(): Promise<PrizeRule[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PrizeRule>('SELECT * FROM prize_rules ORDER BY created_at DESC');
  return rows;
}

export async function getPrizeRulesByRestaurant(restaurantId: string): Promise<PrizeRule[]> {
  await ensureSchema();
  const { rows } = await getPool().query<PrizeRule>(
    `SELECT * FROM prize_rules WHERE restaurant_id = $1 OR restaurant_id IS NULL ORDER BY created_at DESC`,
    [restaurantId]
  );
  return rows;
}

export async function togglePrizeRule(id: string, active: boolean): Promise<PrizeRule | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<PrizeRule>(
    `UPDATE prize_rules SET active = $2 WHERE id = $1 RETURNING *`,
    [id, active]
  );
  return rows[0];
}

export async function countClaimsByContact(phoneOrEmail: string): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) as count FROM claims WHERE phone = $1 OR email = $1`,
    [phoneOrEmail]
  );
  return parseInt(rows[0].count, 10);
}

// ── Game Bundles ──────────────────────────────────────────────────────────────

export type GameBundle = {
  id: string;
  name: string;
  game_type: 'roulette' | 'slots' | 'penalty' | 'scratch';
  restaurant_id: string | null;
  active: boolean;
  created_at: string;
};

export type GamePrize = {
  id: string;
  bundle_id: string;
  name: string;
  description: string;
  probability: number;
  max_winners: number | null;
  winners_count: number;
  sort_order: number;
  created_at: string;
};

export type GamePlay = {
  id: string;
  bundle_id: string;
  game_prize_id: string;
  full_name: string;
  phone: string;
  email: string;
  location: string | null;
  folio: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
  played_at: string;
};

async function ensureGameSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_bundles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        game_type TEXT NOT NULL DEFAULT 'roulette',
        restaurant_id TEXT REFERENCES restaurants(id),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS game_prizes (
        id TEXT PRIMARY KEY,
        bundle_id TEXT NOT NULL REFERENCES game_bundles(id),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        probability INTEGER NOT NULL,
        max_winners INTEGER,
        winners_count INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS game_plays (
        id TEXT PRIMARY KEY,
        bundle_id TEXT NOT NULL REFERENCES game_bundles(id),
        game_prize_id TEXT NOT NULL REFERENCES game_prizes(id),
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        location TEXT,
        folio TEXT,
        redeemed_at TIMESTAMPTZ,
        redeemed_by TEXT,
        played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE game_plays ADD COLUMN IF NOT EXISTS folio TEXT;
      ALTER TABLE game_plays ADD COLUMN IF NOT EXISTS redeemed_at TIMESTAMPTZ;
      ALTER TABLE game_plays ADD COLUMN IF NOT EXISTS redeemed_by TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS game_plays_folio_idx ON game_plays(folio) WHERE folio IS NOT NULL;
    `);
  } finally {
    client.release();
  }
}

export async function insertGameBundle(
  bundle: Omit<GameBundle, 'created_at'>
): Promise<GameBundle> {
  await ensureSchema();
  await ensureGameSchema();
  const { rows } = await getPool().query<GameBundle>(
    `INSERT INTO game_bundles (id, name, game_type, restaurant_id, active)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [bundle.id, bundle.name, bundle.game_type, bundle.restaurant_id ?? null, bundle.active]
  );
  return rows[0];
}

export async function insertGamePrize(
  prize: Omit<GamePrize, 'created_at' | 'winners_count'>
): Promise<GamePrize> {
  await ensureGameSchema();
  const { rows } = await getPool().query<GamePrize>(
    `INSERT INTO game_prizes (id, bundle_id, name, description, probability, max_winners, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [prize.id, prize.bundle_id, prize.name, prize.description, prize.probability, prize.max_winners ?? null, prize.sort_order]
  );
  return rows[0];
}

export async function getGameBundleById(id: string): Promise<GameBundle | undefined> {
  await ensureGameSchema();
  const { rows } = await getPool().query<GameBundle>(
    'SELECT * FROM game_bundles WHERE id = $1',
    [id]
  );
  return rows[0];
}

export async function getGamePrizesForBundle(bundleId: string): Promise<GamePrize[]> {
  await ensureGameSchema();
  const { rows } = await getPool().query<GamePrize>(
    'SELECT * FROM game_prizes WHERE bundle_id = $1 ORDER BY sort_order ASC',
    [bundleId]
  );
  return rows;
}

export async function insertGamePlay(play: Omit<GamePlay, 'played_at' | 'folio' | 'redeemed_at' | 'redeemed_by'>): Promise<GamePlay> {
  await ensureGameSchema();
  const folio = `PT-${play.id.slice(0, 8).toUpperCase()}`;
  const { rows } = await getPool().query<GamePlay>(
    `INSERT INTO game_plays (id, bundle_id, game_prize_id, full_name, phone, email, location, folio)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [play.id, play.bundle_id, play.game_prize_id, play.full_name, play.phone, play.email, play.location ?? null, folio]
  );
  return rows[0];
}

export async function getGamePlayByFolio(folio: string): Promise<(GamePlay & { prize_name: string; bundle_name: string }) | undefined> {
  await ensureGameSchema();
  const { rows } = await getPool().query<GamePlay & { prize_name: string; bundle_name: string }>(
    `SELECT gp.*, gpr.name as prize_name, gb.name as bundle_name
     FROM game_plays gp
     JOIN game_prizes gpr ON gpr.id = gp.game_prize_id
     JOIN game_bundles gb ON gb.id = gp.bundle_id
     WHERE gp.folio = $1`,
    [folio.trim().toUpperCase()]
  );
  return rows[0];
}

export async function redeemGamePlay(folio: string, redeemedBy: string): Promise<GamePlay | undefined> {
  await ensureGameSchema();
  const { rows } = await getPool().query<GamePlay>(
    `UPDATE game_plays SET redeemed_at = NOW(), redeemed_by = $2
     WHERE folio = $1 AND redeemed_at IS NULL RETURNING *`,
    [folio.trim().toUpperCase(), redeemedBy]
  );
  return rows[0];
}

export async function incrementWinnersCount(prizeid: string): Promise<void> {
  await ensureGameSchema();
  await getPool().query(
    'UPDATE game_prizes SET winners_count = winners_count + 1 WHERE id = $1',
    [prizeid]
  );
}

export async function getAllGameBundles(): Promise<(GameBundle & { restaurant_name: string | null; prize_count: number; play_count: number })[]> {
  await ensureGameSchema();
  const { rows } = await getPool().query<GameBundle & { restaurant_name: string | null; prize_count: number; play_count: number }>(`
    SELECT gb.*,
           r.name AS restaurant_name,
           (SELECT COUNT(*) FROM game_prizes gp WHERE gp.bundle_id = gb.id)::int AS prize_count,
           (SELECT COUNT(*) FROM game_plays gpl WHERE gpl.bundle_id = gb.id)::int AS play_count
    FROM game_bundles gb
    LEFT JOIN restaurants r ON r.id = gb.restaurant_id
    ORDER BY gb.created_at DESC
  `);
  return rows;
}

export async function toggleGameBundle(id: string, active: boolean): Promise<GameBundle | undefined> {
  await ensureGameSchema();
  const { rows } = await getPool().query<GameBundle>(
    'UPDATE game_bundles SET active = $2 WHERE id = $1 RETURNING *',
    [id, active]
  );
  return rows[0];
}

export type GameBundleAnalytics = {
  total_plays: number;
  total_redemptions: number;
  prizes: {
    id: string;
    name: string;
    probability: number;
    max_winners: number | null;
    winners_count: number;
    play_count: number;
    redemption_count: number;
  }[];
};

export async function getGameBundleAnalytics(bundleId: string): Promise<GameBundleAnalytics> {
  await ensureGameSchema();
  const { rows: prizeRows } = await getPool().query<{
    id: string; name: string; probability: number; max_winners: number | null; winners_count: number;
    play_count: string; redemption_count: string;
  }>(
    `SELECT gpr.id, gpr.name, gpr.probability, gpr.max_winners, gpr.winners_count,
            COUNT(gpl.id)::text AS play_count,
            COUNT(gpl.id) FILTER (WHERE gpl.redeemed_at IS NOT NULL)::text AS redemption_count
     FROM game_prizes gpr
     LEFT JOIN game_plays gpl ON gpl.game_prize_id = gpr.id
     WHERE gpr.bundle_id = $1
     GROUP BY gpr.id
     ORDER BY gpr.sort_order ASC`,
    [bundleId]
  );

  const prizes = prizeRows.map((p) => ({
    id: p.id,
    name: p.name,
    probability: p.probability,
    max_winners: p.max_winners,
    winners_count: p.winners_count,
    play_count: Number(p.play_count),
    redemption_count: Number(p.redemption_count),
  }));

  const total_plays = prizes.reduce((sum, p) => sum + p.play_count, 0);
  const total_redemptions = prizes.reduce((sum, p) => sum + p.redemption_count, 0);

  return { total_plays, total_redemptions, prizes };
}

// ── Ticket Tiers ──────────────────────────────────────────────────────────────

export type TicketTier = {
  id: string;
  restaurant_id: string;
  min_amount: number;
  max_amount: number | null;
  prize_name: string;
  prize_description: string;
  game_type: string | null;
  sort_order: number;
  created_at: string;
};

export type TicketClaim = {
  id: string;
  restaurant_id: string;
  amount: number;
  prize_name: string;
  prize_description: string;
  full_name: string;
  phone: string;
  location: string | null;
  image_hash: string | null;
  claimed_at: string;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_by: string | null;
  consolation_code: string | null;
};

export async function insertTicketTier(tier: Omit<TicketTier, 'created_at'>): Promise<TicketTier> {
  await ensureSchema();
  const { rows } = await getPool().query<TicketTier>(
    `INSERT INTO ticket_tiers (id, restaurant_id, min_amount, max_amount, prize_name, prize_description, game_type, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [tier.id, tier.restaurant_id, tier.min_amount, tier.max_amount ?? null, tier.prize_name, tier.prize_description, tier.game_type ?? null, tier.sort_order]
  );
  return rows[0];
}

export async function getTicketTiersByRestaurant(restaurantId: string): Promise<TicketTier[]> {
  await ensureSchema();
  const { rows } = await getPool().query<TicketTier>(
    `SELECT * FROM ticket_tiers WHERE restaurant_id = $1 ORDER BY sort_order ASC, min_amount ASC`,
    [restaurantId]
  );
  return rows;
}

export async function upsertTicketTiers(restaurantId: string, tiers: Omit<TicketTier, 'id' | 'restaurant_id' | 'created_at'>[]): Promise<TicketTier[]> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM ticket_tiers WHERE restaurant_id = $1', [restaurantId]);
    const result: TicketTier[] = [];
    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      const id = crypto.randomUUID();
      const { rows } = await client.query<TicketTier>(
        `INSERT INTO ticket_tiers (id, restaurant_id, min_amount, max_amount, prize_name, prize_description, game_type, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [id, restaurantId, t.min_amount, t.max_amount ?? null, t.prize_name, t.prize_description, t.game_type ?? null, i]
      );
      result.push(rows[0]);
    }
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function insertTicketClaim(claim: Omit<TicketClaim, 'claimed_at'>): Promise<TicketClaim> {
  await ensureSchema();
  const { rows } = await getPool().query<TicketClaim>(
    `INSERT INTO ticket_claims (id, restaurant_id, amount, prize_name, prize_description, full_name, phone, location, image_hash, expires_at, consolation_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [claim.id, claim.restaurant_id, claim.amount, claim.prize_name, claim.prize_description, claim.full_name, claim.phone, claim.location ?? null, claim.image_hash ?? null, claim.expires_at ?? null, claim.consolation_code ?? null]
  );
  return rows[0];
}

export async function getTicketClaimByConsolationCode(code: string): Promise<(TicketClaim & { restaurant_name: string | null }) | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<TicketClaim & { restaurant_name: string | null }>(
    `SELECT tc.*, r.name AS restaurant_name
     FROM ticket_claims tc
     LEFT JOIN restaurants r ON r.id = tc.restaurant_id
     WHERE tc.consolation_code = $1`,
    [code]
  );
  return rows[0];
}

export async function redeemConsolationCode(code: string, redeemedBy: string): Promise<TicketClaim | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<TicketClaim>(
    `UPDATE ticket_claims SET redeemed_at = NOW(), redeemed_by = $2
     WHERE consolation_code = $1 AND redeemed_at IS NULL
     RETURNING *`,
    [code, redeemedBy]
  );
  return rows[0];
}

export async function findTicketClaimByImageHash(imageHash: string): Promise<{ id: string } | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT id FROM ticket_claims WHERE image_hash = $1 LIMIT 1`,
    [imageHash]
  );
  return rows[0];
}

export async function countTicketClaimsByPhoneToday(phone: string, restaurantId: string): Promise<number> {
  await ensureSchema();
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ticket_claims
     WHERE phone = $1 AND restaurant_id = $2
       AND claimed_at >= CURRENT_DATE AND claimed_at < CURRENT_DATE + INTERVAL '1 day'`,
    [phone, restaurantId]
  );
  return parseInt(rows[0].count, 10);
}

export async function getTicketClaimsByRestaurant(restaurantId: string): Promise<TicketClaim[]> {
  await ensureSchema();
  const { rows } = await getPool().query<TicketClaim>(
    `SELECT * FROM ticket_claims WHERE restaurant_id = $1 ORDER BY claimed_at DESC`,
    [restaurantId]
  );
  return rows;
}

// ── Restaurant Ticket Config ──────────────────────────────────────────────────

export type RestaurantTicketConfig = {
  restaurant_id: string;
  consolation_prize_name: string;
  consolation_prize_description: string;
  min_amount_for_game: number;
  welcome_title: string | null;
  welcome_subtitle: string | null;
  primary_color: string | null;
  updated_at: string;
};

export async function getRestaurantTicketConfig(restaurantId: string): Promise<RestaurantTicketConfig | null> {
  await ensureSchema();
  const { rows } = await getPool().query<RestaurantTicketConfig>(
    `SELECT * FROM restaurant_ticket_config WHERE restaurant_id = $1`,
    [restaurantId]
  );
  return rows[0] ?? null;
}

export async function upsertRestaurantTicketConfig(
  restaurantId: string,
  config: Pick<RestaurantTicketConfig, 'consolation_prize_name' | 'consolation_prize_description' | 'min_amount_for_game'> &
    Partial<Pick<RestaurantTicketConfig, 'welcome_title' | 'welcome_subtitle' | 'primary_color'>>
): Promise<RestaurantTicketConfig> {
  await ensureSchema();
  const { rows } = await getPool().query<RestaurantTicketConfig>(
    `INSERT INTO restaurant_ticket_config (restaurant_id, consolation_prize_name, consolation_prize_description, min_amount_for_game, welcome_title, welcome_subtitle, primary_color, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (restaurant_id) DO UPDATE SET
       consolation_prize_name = EXCLUDED.consolation_prize_name,
       consolation_prize_description = EXCLUDED.consolation_prize_description,
       min_amount_for_game = EXCLUDED.min_amount_for_game,
       welcome_title = EXCLUDED.welcome_title,
       welcome_subtitle = EXCLUDED.welcome_subtitle,
       primary_color = EXCLUDED.primary_color,
       updated_at = NOW()
     RETURNING *`,
    [restaurantId, config.consolation_prize_name, config.consolation_prize_description, config.min_amount_for_game,
     config.welcome_title ?? null, config.welcome_subtitle ?? null, config.primary_color ?? '#2563EB']
  );
  return rows[0];
}

export async function getTicketFeedbackStats(restaurantId: string): Promise<{ avg_rating: number; total: number }> {
  await ensureSchema();
  const { rows } = await getPool().query<{ avg_rating: string | null; total: string }>(
    `SELECT AVG((metadata->>'stars')::numeric)::text AS avg_rating, COUNT(*)::text AS total
     FROM activity_log
     WHERE action = 'ticket_feedback' AND restaurant_id = $1 AND metadata->>'stars' IS NOT NULL`,
    [restaurantId]
  );
  return {
    avg_rating: rows[0].avg_rating ? Math.round(parseFloat(rows[0].avg_rating) * 10) / 10 : 0,
    total: parseInt(rows[0].total, 10),
  };
}

export async function getGamePlaysByBundle(bundleId: string): Promise<(GamePlay & { prize_name: string })[]> {
  await ensureGameSchema();
  const { rows } = await getPool().query<GamePlay & { prize_name: string }>(`
    SELECT gpl.*, gp.name AS prize_name
    FROM game_plays gpl
    JOIN game_prizes gp ON gp.id = gpl.game_prize_id
    WHERE gpl.bundle_id = $1
    ORDER BY gpl.played_at DESC
  `, [bundleId]);
  return rows;
}

// ── Restaurant Events ─────────────────────────────────────────────────────────

export type RestaurantEvent = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  event_type: 'double_points' | 'first_N' | 'min_amount_boost';
  multiplier: number;
  max_participants: number | null;
  participants_count: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_at: string;
};

export type RestaurantEventWithRestaurant = RestaurantEvent & {
  restaurant_name: string | null;
};

export async function getActiveEvents(restaurantId: string): Promise<RestaurantEvent[]> {
  await ensureSchema();
  const now = new Date().toISOString();
  const { rows } = await getPool().query<RestaurantEvent>(
    `SELECT * FROM restaurant_events
     WHERE restaurant_id = $1
       AND active = TRUE
       AND starts_at <= $2
       AND ends_at >= $2
     ORDER BY starts_at ASC`,
    [restaurantId, now]
  );
  return rows;
}

export async function getAllEvents(): Promise<RestaurantEventWithRestaurant[]> {
  await ensureSchema();
  const { rows } = await getPool().query<RestaurantEventWithRestaurant>(`
    SELECT e.*, r.name AS restaurant_name
    FROM restaurant_events e
    LEFT JOIN restaurants r ON r.id = e.restaurant_id
    ORDER BY e.starts_at DESC
  `);
  return rows;
}

export async function createEvent(
  event: Omit<RestaurantEvent, 'created_at' | 'participants_count'>
): Promise<RestaurantEvent> {
  await ensureSchema();
  const { rows } = await getPool().query<RestaurantEvent>(
    `INSERT INTO restaurant_events
       (id, restaurant_id, name, description, event_type, multiplier, max_participants, starts_at, ends_at, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      event.id,
      event.restaurant_id,
      event.name,
      event.description ?? null,
      event.event_type,
      event.multiplier,
      event.max_participants ?? null,
      event.starts_at,
      event.ends_at,
      event.active,
    ]
  );
  return rows[0];
}

export async function endEvent(id: string): Promise<RestaurantEvent | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<RestaurantEvent>(
    `UPDATE restaurant_events SET active = FALSE, ends_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

export async function incrementParticipants(eventId: string): Promise<RestaurantEvent | undefined> {
  await ensureSchema();
  const { rows } = await getPool().query<RestaurantEvent>(
    `UPDATE restaurant_events SET participants_count = participants_count + 1 WHERE id = $1 RETURNING *`,
    [eventId]
  );
  return rows[0];
}

// ── Dynamic (auto-triggered) events ─────────────────────────────────────────

export type RestaurantWithLocation = Restaurant & { lat: number; lng: number };

export async function getRestaurantsWithLocation(): Promise<RestaurantWithLocation[]> {
  await ensureSchema();
  const { rows } = await getPool().query<RestaurantWithLocation>(
    `SELECT * FROM restaurants WHERE lat IS NOT NULL AND lng IS NOT NULL`
  );
  return rows;
}

export async function logDynamicEvent(params: {
  id: string;
  restaurant_id: string;
  trigger_type: string;
  event_id: string;
  triggered_date: string;
}): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `INSERT INTO dynamic_event_log (id, restaurant_id, trigger_type, event_id, triggered_date)
     VALUES ($1,$2,$3,$4,$5)`,
    [params.id, params.restaurant_id, params.trigger_type, params.event_id, params.triggered_date]
  );
}

export async function getDayOfWeekAverages(restaurantId: string): Promise<Array<{ dow: number; avg_count: number }>> {
  await ensureSchema();
  const { rows } = await getPool().query<{ dow: number; avg_count: number }>(
    `SELECT dow, AVG(daily_count) AS avg_count
     FROM (
       SELECT DATE(c.claimed_at) AS d, EXTRACT(DOW FROM c.claimed_at)::int AS dow, COUNT(*) AS daily_count
       FROM claims c
       JOIN prizes p ON c.prize_id = p.id
       WHERE p.restaurant_id = $1
         AND c.claimed_at > NOW() - INTERVAL '28 days'
       GROUP BY DATE(c.claimed_at), EXTRACT(DOW FROM c.claimed_at)
     ) sub
     GROUP BY dow
     ORDER BY avg_count ASC`,
    [restaurantId]
  );
  return rows;
}

export async function getSlowestDayOfWeek(restaurantId: string): Promise<number | null> {
  const averages = await getDayOfWeekAverages(restaurantId);
  // Need data for at least 4 distinct days-of-week to draw a meaningful comparison.
  if (averages.length < 4) return null;
  return averages[0].dow;
}

// ── Game Analytics ────────────────────────────────────────────────────────────

export type GameAnalytics = {
  id: string;
  bundle_id: string | null;
  game_type: string;
  restaurant_id: string | null;
  started_at: string;
  completed_at: string | null;
  time_spent_ms: number | null;
  prize_won: string | null;
  claim_completed: boolean;
};

async function ensureGameAnalyticsSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_analytics (
        id TEXT PRIMARY KEY,
        bundle_id TEXT REFERENCES game_bundles(id),
        game_type TEXT NOT NULL,
        restaurant_id TEXT REFERENCES restaurants(id),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        time_spent_ms INTEGER,
        prize_won TEXT,
        claim_completed BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);
  } finally {
    client.release();
  }
}

export async function logGameStart(entry: {
  id: string;
  bundle_id?: string | null;
  game_type: string;
  restaurant_id?: string | null;
}): Promise<GameAnalytics> {
  await ensureGameSchema();
  await ensureGameAnalyticsSchema();
  const { rows } = await getPool().query<GameAnalytics>(
    `INSERT INTO game_analytics (id, bundle_id, game_type, restaurant_id)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [entry.id, entry.bundle_id ?? null, entry.game_type, entry.restaurant_id ?? null]
  );
  return rows[0];
}

export async function logGameComplete(sessionId: string, data: {
  time_spent_ms?: number | null;
  prize_won?: string | null;
}): Promise<GameAnalytics | undefined> {
  await ensureGameAnalyticsSchema();
  const { rows } = await getPool().query<GameAnalytics>(
    `UPDATE game_analytics
     SET completed_at = NOW(), time_spent_ms = $2, prize_won = $3
     WHERE id = $1 RETURNING *`,
    [sessionId, data.time_spent_ms ?? null, data.prize_won ?? null]
  );
  return rows[0];
}

export async function markGameClaimCompleted(sessionId: string): Promise<void> {
  await ensureGameAnalyticsSchema();
  await getPool().query(
    `UPDATE game_analytics SET claim_completed = TRUE WHERE id = $1`,
    [sessionId]
  );
}

export async function getGameAnalytics(restaurantId?: string): Promise<{
  rows: GameAnalytics[];
  byType: Array<{ game_type: string; play_count: number; completion_rate: number; avg_time_ms: number | null }>;
  hourly: Array<{ hour: number; count: number }>;
  prizes: Array<{ prize_won: string; count: number }>;
}> {
  await ensureGameAnalyticsSchema();
  const condition = restaurantId ? `WHERE restaurant_id = $1` : '';
  const params: unknown[] = restaurantId ? [restaurantId] : [];

  const { rows } = await getPool().query<GameAnalytics>(
    `SELECT * FROM game_analytics ${condition} ORDER BY started_at DESC LIMIT 1000`,
    params
  );

  const byTypeCondition = restaurantId ? `WHERE restaurant_id = $1` : '';
  const { rows: byType } = await getPool().query<{
    game_type: string; play_count: string; completion_rate: string; avg_time_ms: string | null;
  }>(
    `SELECT game_type,
            COUNT(*)::text AS play_count,
            ROUND(100.0 * COUNT(*) FILTER (WHERE claim_completed) / NULLIF(COUNT(*), 0), 1)::text AS completion_rate,
            AVG(time_spent_ms)::text AS avg_time_ms
     FROM game_analytics ${byTypeCondition}
     GROUP BY game_type ORDER BY play_count DESC`,
    params
  );

  const { rows: hourly } = await getPool().query<{ hour: string; count: string }>(
    `SELECT EXTRACT(HOUR FROM started_at)::int::text AS hour, COUNT(*)::text AS count
     FROM game_analytics ${byTypeCondition}
     GROUP BY 1 ORDER BY 1`,
    params
  );

  const prizeCondition = restaurantId
    ? `WHERE restaurant_id = $1 AND prize_won IS NOT NULL`
    : `WHERE prize_won IS NOT NULL`;
  const { rows: prizes } = await getPool().query<{ prize_won: string; count: string }>(
    `SELECT prize_won, COUNT(*)::text AS count
     FROM game_analytics ${prizeCondition}
     GROUP BY prize_won ORDER BY count DESC LIMIT 20`,
    params
  );

  return {
    rows,
    byType: byType.map((r) => ({
      game_type: r.game_type,
      play_count: parseInt(r.play_count, 10),
      completion_rate: parseFloat(r.completion_rate ?? '0'),
      avg_time_ms: r.avg_time_ms ? parseFloat(r.avg_time_ms) : null,
    })),
    hourly: hourly.map((r) => ({ hour: parseInt(r.hour, 10), count: parseInt(r.count, 10) })),
    prizes: prizes.map((r) => ({ prize_won: r.prize_won, count: parseInt(r.count, 10) })),
  };
}

// ── Stamp Cards ───────────────────────────────────────────────────────────────

export type StampCard = {
  id: string;
  phone: string;
  email: string;
  restaurant_id: string | null;
  stamps_count: number;
  stamps_required: number;
  completed_at: string | null;
  prize_claimed: boolean;
  created_at: string;
};

export async function getOrCreateStampCard(
  phone: string,
  email: string,
  restaurantId: string | null
): Promise<StampCard> {
  await ensureSchema();
  // Try to find an active (incomplete) card
  const { rows: existing } = await getPool().query<StampCard>(
    `SELECT * FROM stamp_cards WHERE phone = $1 AND (restaurant_id = $2 OR ($2::text IS NULL AND restaurant_id IS NULL)) AND completed_at IS NULL LIMIT 1`,
    [phone, restaurantId ?? null]
  );
  if (existing[0]) return existing[0];
  // Create a new card
  const id = crypto.randomUUID();
  const { rows } = await getPool().query<StampCard>(
    `INSERT INTO stamp_cards (id, phone, email, restaurant_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, phone, email, restaurantId ?? null]
  );
  return rows[0];
}

export async function addStamp(cardId: string): Promise<StampCard> {
  await ensureSchema();
  const { rows } = await getPool().query<StampCard>(
    `UPDATE stamp_cards SET stamps_count = stamps_count + 1 WHERE id = $1 RETURNING *`,
    [cardId]
  );
  return rows[0];
}

export async function completeStampCard(cardId: string): Promise<StampCard> {
  await ensureSchema();
  const { rows } = await getPool().query<StampCard>(
    `UPDATE stamp_cards SET completed_at = NOW() WHERE id = $1 RETURNING *`,
    [cardId]
  );
  return rows[0];
}

export async function getStampCardsByPhone(phone: string): Promise<StampCard[]> {
  await ensureSchema();
  const { rows } = await getPool().query<StampCard>(
    `SELECT * FROM stamp_cards WHERE phone = $1 ORDER BY created_at DESC`,
    [phone]
  );
  return rows;
}

// ── Password Reset Tokens ─────────────────────────────────────────────────────

export type PasswordResetToken = {
  id: string;
  username: string;
  token: string;
  expires_at: string;
  used_at: string | null;
};

async function ensurePasswordResetSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ
      );
    `);
  } finally {
    client.release();
  }
}

export async function insertResetToken(
  id: string,
  username: string,
  token: string
): Promise<PasswordResetToken> {
  await ensurePasswordResetSchema();
  const { rows } = await getPool().query<PasswordResetToken>(
    `INSERT INTO password_reset_tokens (id, username, token, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')
     RETURNING *`,
    [id, username, token]
  );
  return rows[0];
}

export async function getResetToken(token: string): Promise<PasswordResetToken | undefined> {
  await ensurePasswordResetSchema();
  const { rows } = await getPool().query<PasswordResetToken>(
    `SELECT * FROM password_reset_tokens WHERE token = $1`,
    [token]
  );
  return rows[0];
}

export async function markTokenUsed(token: string): Promise<void> {
  await ensurePasswordResetSchema();
  await getPool().query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1`,
    [token]
  );
}

export async function updateUserPassword(username: string, passwordHash: string): Promise<void> {
  await ensureSchema();
  await getPool().query(
    `UPDATE users SET password_hash = $2 WHERE username = $1`,
    [username, passwordHash]
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType = 'new_claim' | 'prize_expiring' | 'vip_customer' | 'new_delivery' | 'low_prizes' | 'daily_summary' | 'platform_update' | 'forgotten_clock_out';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  restaurant_id: string | null;
  read_at: string | null;
  created_at: string;
};

async function ensureNotificationsSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        link TEXT,
        restaurant_id TEXT REFERENCES restaurants(id),
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

export async function createNotification(n: {
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  restaurant_id?: string | null;
}): Promise<Notification> {
  await ensureNotificationsSchema();
  const id = crypto.randomUUID();
  const { rows } = await getPool().query<Notification>(
    `INSERT INTO notifications (id, type, title, body, link, restaurant_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [id, n.type, n.title, n.body, n.link ?? null, n.restaurant_id ?? null]
  );
  return rows[0];
}

export async function getUnreadNotifications(restaurantId?: string | null): Promise<Notification[]> {
  await ensureNotificationsSchema();
  if (restaurantId) {
    const { rows } = await getPool().query<Notification>(
      `SELECT * FROM notifications
       WHERE read_at IS NULL AND (restaurant_id = $1 OR restaurant_id IS NULL)
       ORDER BY created_at DESC LIMIT 50`,
      [restaurantId]
    );
    return rows;
  }
  const { rows } = await getPool().query<Notification>(
    `SELECT * FROM notifications WHERE read_at IS NULL ORDER BY created_at DESC LIMIT 50`
  );
  return rows;
}

export async function markAllRead(restaurantId?: string | null): Promise<void> {
  await ensureNotificationsSchema();
  if (restaurantId) {
    await getPool().query(
      `UPDATE notifications SET read_at = NOW()
       WHERE read_at IS NULL AND (restaurant_id = $1 OR restaurant_id IS NULL)`,
      [restaurantId]
    );
  } else {
    await getPool().query(`UPDATE notifications SET read_at = NOW() WHERE read_at IS NULL`);
  }
}

// ── Internal Messages ─────────────────────────────────────────────────────────

export type InternalMessage = {
  id: string;
  from_role: string;
  to_phone: string;
  to_email: string | null;
  subject: string;
  body: string;
  prize_id: string | null;
  claim_id: string | null;
  read_at: string | null;
  created_at: string;
};

export type InternalMessageWithPrize = InternalMessage & {
  prize_name: string | null;
};

async function ensureMessagesSchema(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS internal_messages (
        id TEXT PRIMARY KEY,
        from_role TEXT NOT NULL DEFAULT 'system',
        to_phone TEXT NOT NULL,
        to_email TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        prize_id TEXT REFERENCES prizes(id),
        claim_id TEXT REFERENCES claims(id),
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

export async function insertInternalMessage(
  msg: Omit<InternalMessage, 'created_at' | 'read_at'>
): Promise<InternalMessage> {
  await ensureMessagesSchema();
  const { rows } = await getPool().query<InternalMessage>(
    `INSERT INTO internal_messages (id, from_role, to_phone, to_email, subject, body, prize_id, claim_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [msg.id, msg.from_role, msg.to_phone, msg.to_email ?? null, msg.subject, msg.body, msg.prize_id ?? null, msg.claim_id ?? null]
  );
  return rows[0];
}

export async function getMessagesForContact(phone: string): Promise<InternalMessageWithPrize[]> {
  await ensureMessagesSchema();
  const { rows } = await getPool().query<InternalMessageWithPrize>(
    `SELECT m.*, p.name AS prize_name
     FROM internal_messages m
     LEFT JOIN prizes p ON p.id = m.prize_id
     WHERE m.to_phone = $1
     ORDER BY m.read_at NULLS FIRST, m.created_at DESC`,
    [phone]
  );
  return rows;
}

export async function markMessageRead(id: string): Promise<InternalMessage | undefined> {
  await ensureMessagesSchema();
  const { rows } = await getPool().query<InternalMessage>(
    `UPDATE internal_messages SET read_at = NOW() WHERE id = $1 AND read_at IS NULL RETURNING *`,
    [id]
  );
  return rows[0];
}

// ── Contabilidad: proveedores, compras, fichas de costo, asientos ──────────────
// `suppliers` YA EXISTE (la usa Inventario) — se reutiliza tal cual, con sus
// columnas reales (id TEXT, contact_phone, contact_email). Todo lo demás
// aquí es nuevo para este módulo.
let accountingSchemaEnsured = false;

export async function ensureAccountingSchema(): Promise<void> {
  if (accountingSchemaEnsured) return;
  const client = await getPool().connect();
  try {
    await client.query(`
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

      CREATE TABLE IF NOT EXISTS budget_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id TEXT,
        month TEXT NOT NULL,
        category TEXT NOT NULL,
        budgeted NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS budget_items_unique_idx
        ON budget_items (COALESCE(restaurant_id, ''), month, category);

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id TEXT,
        supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
        supplier_name TEXT,
        expected_date DATE,
        status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','recibida','cancelada')),
        notes TEXT,
        items JSONB DEFAULT '[]',
        total NUMERIC(12,2) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    accountingSchemaEnsured = true;
  } finally {
    client.release();
  }
}
