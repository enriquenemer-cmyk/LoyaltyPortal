import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool, ensureSchema } from '@/lib/db';
import {
  getSalesForDateRange,
  getTopCustomers,
  getClaimsCountForDateRange,
  getTopPrizes,
  getInactiveCustomersCount,
  getConversionRate,
  getCurrentInventoryAlerts,
  getSystemHealthCheck,
} from '@/lib/aiDataTools';

export const runtime = 'nodejs';

// ── Asistente gratuito, solo de la plataforma ───────────────────────────────
// No llama a ningún modelo de lenguaje externo (sin costo, sin límite de
// cuota). Detecta la intención por palabras clave en español y responde
// usando SOLO datos reales obtenidos de las herramientas de lib/aiDataTools —
// nunca inventa números ni responde temas ajenos al negocio.

function fmtMoney(n: number): string {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=domingo
  const diff = day === 0 ? 6 : day - 1; // lunes como inicio
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

// Extrae un rango de fechas a partir de expresiones relativas en español.
// Si no se menciona ninguna, usa los últimos 30 días por defecto.
function parseDateRange(text: string): { start: string; end: string; label: string } {
  const now = new Date();
  const today = toISODate(now);

  if (/\bhoy\b/.test(text)) {
    return { start: today, end: today, label: 'hoy' };
  }
  if (/\bayer\b/.test(text)) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { start: toISODate(y), end: toISODate(y), label: 'ayer' };
  }
  if (/semana pasada|semana anterior/.test(text)) {
    const startThis = startOfWeek(now);
    const endLast = new Date(startThis);
    endLast.setDate(endLast.getDate() - 1);
    const startLast = new Date(endLast);
    startLast.setDate(startLast.getDate() - 6);
    return { start: toISODate(startLast), end: toISODate(endLast), label: 'la semana pasada' };
  }
  if (/esta semana/.test(text)) {
    return { start: toISODate(startOfWeek(now)), end: today, label: 'esta semana' };
  }
  if (/mes pasado|mes anterior/.test(text)) {
    const firstThis = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastPrev = new Date(firstThis);
    lastPrev.setDate(lastPrev.getDate() - 1);
    const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
    return { start: toISODate(firstPrev), end: toISODate(lastPrev), label: 'el mes pasado' };
  }
  if (/este mes/.test(text)) {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toISODate(first), end: today, label: 'este mes' };
  }
  const nDays = text.match(/(?:[uú]ltimos?|pasados?)\s+(\d{1,3})\s*d[ií]as/);
  if (nDays) {
    const n = Math.min(parseInt(nDays[1], 10), 366);
    const start = new Date(now);
    start.setDate(start.getDate() - n);
    return { start: toISODate(start), end: today, label: `los últimos ${n} días` };
  }

  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  return { start: toISODate(start), end: today, label: 'los últimos 30 días' };
}

type Reply = { text: string; tool: string };

async function answerSales(text: string): Promise<Reply> {
  const { start, end, label } = parseDateRange(text);
  const data = await getSalesForDateRange(start, end);
  if (data.days === 0) {
    return { text: `No encontré ventas registradas para ${label}.`, tool: 'getSalesForDateRange' };
  }
  return {
    text:
      `Ventas de ${label}: ${fmtMoney(data.total)} en total ` +
      `(${fmtMoney(data.cash)} efectivo, ${fmtMoney(data.card)} tarjeta, ${fmtMoney(data.other)} otros), ` +
      `con ${data.ticket_count} tickets registrados.`,
    tool: 'getSalesForDateRange',
  };
}

async function answerTopCustomers(text: string): Promise<Reply> {
  const nMatch = text.match(/top\s*(\d{1,2})|mejores\s*(\d{1,2})/);
  const limit = nMatch ? parseInt(nMatch[1] ?? nMatch[2], 10) : 5;
  const customers = await getTopCustomers(limit);
  if (customers.length === 0) {
    return { text: 'Todavía no tienes clientes con puntos acumulados.', tool: 'getTopCustomers' };
  }
  const list = customers
    .map((c, i) => `${i + 1}. ${c.full_name || c.phone} — ${c.lifetime_points} pts (${c.tier})`)
    .join('\n');
  return { text: `Tus mejores clientes por puntos de por vida:\n${list}`, tool: 'getTopCustomers' };
}

async function answerClaims(text: string): Promise<Reply> {
  const { start, end, label } = parseDateRange(text);
  const data = await getClaimsCountForDateRange(start, end);
  if (data.total === 0) {
    return { text: `No hubo cobros de premios en ${label}.`, tool: 'getClaimsCountForDateRange' };
  }
  const breakdown = data.by_status.map((s) => `${s.count} ${s.status}`).join(', ');
  return { text: `En ${label} hubo ${data.total} cobros de premios (${breakdown}).`, tool: 'getClaimsCountForDateRange' };
}

async function answerTopPrizes(): Promise<Reply> {
  const prizes = await getTopPrizes(5);
  if (prizes.length === 0) {
    return { text: 'No hay premios canjeados en los últimos 30 días.', tool: 'getTopPrizes' };
  }
  const list = prizes.map((p, i) => `${i + 1}. ${p.name} — ${p.count} canjes`).join('\n');
  return { text: `Premios más canjeados (últimos 30 días):\n${list}`, tool: 'getTopPrizes' };
}

async function answerInactiveCustomers(text: string): Promise<Reply> {
  const nMatch = text.match(/(\d{1,3})\s*d[ií]as/);
  const days = nMatch ? parseInt(nMatch[1], 10) : 30;
  const data = await getInactiveCustomersCount(days);
  return {
    text: `${data.count} clientes no han cobrado ningún premio en los últimos ${data.days_threshold} días.`,
    tool: 'getInactiveCustomersCount',
  };
}

async function answerConversionRate(): Promise<Reply> {
  const data = await getConversionRate();
  if (data.total_prizes === 0) {
    return { text: 'No se generaron premios en los últimos 30 días para calcular una tasa de conversión.', tool: 'getConversionRate' };
  }
  return {
    text: `De ${data.total_prizes} premios generados en los últimos 30 días, se cobraron ${data.total_claims} — una tasa de conversión del ${data.rate}%.`,
    tool: 'getConversionRate',
  };
}

async function answerInventory(): Promise<Reply> {
  const alerts = await getCurrentInventoryAlerts();
  if (alerts.length === 0) {
    return { text: 'Todo tu inventario está por encima del nivel mínimo. Nada por reabastecer ahora mismo.', tool: 'getCurrentInventoryAlerts' };
  }
  const list = alerts.slice(0, 10).map((a) => `${a.name}: ${a.current_stock} ${a.unit} (mínimo ${a.min_stock_alert})`).join('\n');
  return { text: `Productos con stock bajo:\n${list}`, tool: 'getCurrentInventoryAlerts' };
}

async function answerHealthCheck(): Promise<Reply> {
  const h = await getSystemHealthCheck();
  const items: string[] = [];
  if (h.active_game_bundles === 0) items.push('No tienes ninguna campaña de juego activa (Juegos y Tickets).');
  if (h.products_without_sale_price > 0) items.push(`${h.products_without_sale_price} producto(s) de inventario sin precio de venta asignado, así que no aparecen en el Punto de Venta.`);
  if (h.low_stock_products > 0) items.push(`${h.low_stock_products} producto(s) con stock por debajo del mínimo.`);
  if (h.employees_without_schedule > 0) items.push(`${h.employees_without_schedule} empleado(s) sin hora de entrada configurada, así que no se detectan llegadas tarde.`);

  if (items.length === 0) {
    return { text: 'No encontré nada pendiente de configurar: campañas de juego activas, precios de venta puestos, stock e horarios de empleados en orden.', tool: 'getSystemHealthCheck' };
  }
  return { text: `Esto es lo que te falta configurar:\n${items.map((i) => `• ${i}`).join('\n')}`, tool: 'getSystemHealthCheck' };
}

const HELP_TEXT =
  'Solo puedo responder preguntas sobre tu negocio en esta plataforma: ventas, clientes, premios, canjes, inventario y qué te falta configurar. ' +
  'Prueba con algo como "¿cuánto vendí esta semana?", "¿quién es mi mejor cliente?" o "¿qué me falta configurar?".';

async function routeMessage(rawText: string): Promise<Reply> {
  const text = rawText.toLowerCase();

  // Salud del sistema / cosas que faltan — se revisa primero porque es lo
  // más específico y evita que "premio"/"inventario" lo desvíen a otra rama.
  if (/qu[eé] (me )?falta|falta configurar|cosas? (que )?faltan|pendiente(s)? de configurar|salud del sistema/.test(text)) {
    return answerHealthCheck();
  }
  if (/tasa de conversi[oó]n|convers[ií]on/.test(text)) {
    return answerConversionRate();
  }
  if (/inactiv|no ha vuelto|no ha regresado|dej(ó|o) de venir/.test(text)) {
    return answerInactiveCustomers(text);
  }
  if (/mejor(es)? cliente|top cliente|clientes? frecuente/.test(text)) {
    return answerTopCustomers(text);
  }
  if (/premio(s)? m[aá]s|qu[eé] premio se canje|premio.*popular/.test(text)) {
    return answerTopPrizes();
  }
  if (/canje|cobr(o|os|é|e)\b.*premio|premios?.*cobr/.test(text)) {
    return answerClaims(text);
  }
  if (/stock|inventario|reabastec|se est[aá] acabando/.test(text)) {
    return answerInventory();
  }
  if (/vend|venta|ingreso|factur/.test(text)) {
    return answerSales(text);
  }

  return { text: HELP_TEXT, tool: 'help' };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.username) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  let body: { message?: string; session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const userMessage = (body.message ?? '').trim();
  const sessionId = (body.session_id ?? '').trim();
  if (!userMessage || !sessionId) {
    return NextResponse.json({ error: 'message y session_id son requeridos' }, { status: 400 });
  }

  await ensureSchema();
  const pool = getPool();

  try {
    const { text: finalContent, tool } = await routeMessage(userMessage);

    const userId = randomUUID();
    const assistantId = randomUUID();
    await pool.query(
      `INSERT INTO ai_chat_messages (id, session_id, username, role, content) VALUES ($1, $2, $3, 'user', $4)`,
      [userId, sessionId, session.username, userMessage]
    );
    await pool.query(
      `INSERT INTO ai_chat_messages (id, session_id, username, role, content) VALUES ($1, $2, $3, 'assistant', $4)`,
      [assistantId, sessionId, session.username, finalContent]
    );

    return NextResponse.json({ reply: finalContent, used_tools: tool === 'help' ? [] : [tool] });
  } catch (err) {
    console.error('[/api/admin/ai/chat POST]', err);
    return NextResponse.json({ error: 'Ocurrió un error al consultar el asistente. Intenta de nuevo.' }, { status: 500 });
  }
}
