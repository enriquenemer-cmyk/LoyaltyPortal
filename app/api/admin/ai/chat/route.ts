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
  getTotalCustomersCount,
  getNewCustomersCount,
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

async function answerTotalCustomers(): Promise<Reply> {
  const count = await getTotalCustomersCount();
  return { text: `Tienes ${count} clientes registrados en total.`, tool: 'getTotalCustomersCount' };
}

async function answerNewCustomers(text: string): Promise<Reply> {
  const { start, end, label } = parseDateRange(text);
  const count = await getNewCustomersCount(start, end);
  return { text: `${count} clientes nuevos en ${label}.`, tool: 'getNewCustomersCount' };
}

const HELP_TEXT =
  'Solo puedo responder preguntas sobre tu negocio en esta plataforma: ventas, clientes, premios, canjes, inventario, qué te falta configurar, ' +
  'y cómo usar sus funciones (Punto de Venta, Comanda, Fichajes, Contabilidad, etc.). ' +
  'Prueba con algo como "¿cuánto vendí esta semana?", "¿quién es mi mejor cliente?" o "¿cómo funciona el punto de venta?".';

// ── Base de conocimiento: cómo funciona cada parte de la plataforma ─────────
// Se evalúa ANTES que las consultas de datos, para que "¿cómo funciona el
// punto de VENTA?" no termine reportando cifras de ventas por error.
const HOWTO_QUESTION_RE = /c[oó]mo (funciona|uso|se usa|agrego|agregar|creo|crear|cambio|cambiar|configuro|configurar|hago|hacer|activo|activar|edito|editar|abro|abrir|pongo|poner|registro|registrar|genero|generar|marco|marcar|reviso|revisar|consigo|obtengo)|qu[eé] es\b|para qu[eé] sirve|d[oó]nde (veo|encuentro|est[aá]|puedo|se ve|configuro|registro)|ayuda con/;

const FAQ: { re: RegExp; answer: string }[] = [
  {
    re: /punto de venta|\btpv\b|\bpos\b/,
    answer:
      'El Punto de Venta está en /venta y se abre con el mismo PIN que usan los empleados para fichar. ' +
      'Seleccionas los artículos, cobras, y el stock se descuenta solo en Inventario. ' +
      'Para que un producto aparezca ahí, primero debes ponerle un "Precio de venta" desde Inventario — sin precio, no sale en la lista. ' +
      'También hay un botón "Abrir punto de venta" dentro de Inventario.',
  },
  {
    re: /comanda/,
    answer:
      'La Comanda (/comanda) es la pantalla para cocina o almacén: cada venta del Punto de Venta aparece ahí como tarjeta y pasa por Pendiente → Preparando → Listo → Entregado. ' +
      'Se abre con el mismo PIN de empleado, y se actualiza sola cada pocos segundos sin que nadie tenga que recargar la página.',
  },
  {
    re: /empleado/,
    answer:
      'Para agregar un empleado ve a Fichajes → Nuevo Empleado: le pones nombre, un PIN de 4 a 6 dígitos, puesto, pago por hora y la hora de entrada esperada (para detectar llegadas tarde). ' +
      'Con ese mismo PIN el empleado puede fichar entrada/salida en /fichaje, y también usar el Punto de Venta y la Comanda.',
  },
  {
    re: /juego|campa[ñn]a/,
    answer:
      'Las campañas de juego están en Juegos y Tickets → Juegos con Premios. Ahí creas una campaña con 2 a 8 premios y sus probabilidades, y obtienes un link para compartir. ' +
      'El cliente juega y gana un premio real con un folio verificable, que se cobra en /cajero/verificar-juego. ' +
      'También puedes ver las analíticas de cada campaña (qué premio se gana más, cuántos reclaman de verdad) desde el botón "Analíticas".',
  },
  {
    re: /premio/,
    answer:
      'Para generar un premio ve a "Generar Premio" en el panel principal: eliges nombre, razón, plantilla y validez, y se genera un QR que el cliente escanea para reclamarlo. ' +
      'Todos los premios que has generado, con su estado (activo, canjeado, expirado, cancelado), se ven en Premios → Mis Premios. ' +
      'El cajero cobra uno desde /cajero/verificar-codigo.',
  },
  {
    // Se evalúa antes que "inventario/proveedor" — si mencionan compra u
    // orden de compra, es del módulo de Contabilidad, no de Inventario.
    re: /compra|orden(es)? de compra/,
    answer:
      'En Contabilidad → Proveedores y Compras registras cada compra que le haces a un proveedor, y se genera automáticamente un gasto en el resumen contable. ' +
      'También puedes crear Órdenes de Compra: al marcarlas como "recibida", generan solas la compra y el asiento contable.',
  },
  {
    re: /precio|inventario|stock|proveedor/,
    answer:
      'En Inventario das de alta productos, registras entradas y salidas de stock, y les asignas un "Precio de venta" — solo los productos con precio asignado aparecen en el Punto de Venta. ' +
      'También puedes asignarles un proveedor y ver el historial de precio de cada uno.',
  },
  {
    re: /contabilidad|ficha(s)? de costo|corte de caja|flujo de caja|presupuesto/,
    answer:
      'Contabilidad tiene el resumen de ingresos y gastos, un estado de resultados (P&L), corte de caja diario por forma de pago, flujo de caja proyectado a 30 días, presupuesto por categoría, ' +
      'y Fichas de Costo para calcular el margen real de tus productos (simples o con receta).',
  },
  {
    re: /fichaje|\bpin\b|horario/,
    answer:
      'Fichajes controla la entrada y salida del personal — cada empleado ficha con su PIN en /fichaje. ' +
      'Si le configuras una hora de entrada esperada al empleado, el sistema marca automáticamente si llegó tarde, y puedes exportar la nómina en CSV.',
  },
  {
    re: /\blead(s)?\b/,
    answer:
      'Leads (en Clientes → Leads) junta a todas las personas que han dejado su contacto, ya sea reclamando un premio o jugando un juego — antes vivían separados. ' +
      'Se puede buscar y exportar a CSV.',
  },
  {
    re: /cliente/,
    answer:
      'La Base de Clientes muestra a cada cliente con sus puntos, nivel (tier) y actividad. Se llena sola cuando alguien reclama un premio por primera vez.',
  },
];

function answerFAQ(text: string): Reply | null {
  if (!HOWTO_QUESTION_RE.test(text)) return null;
  for (const item of FAQ) {
    if (item.re.test(text)) return { text: item.answer, tool: 'faq' };
  }
  return null;
}

async function routeMessage(rawText: string): Promise<Reply> {
  const text = rawText.toLowerCase();

  // "¿Cómo funciona X?" / "¿Qué es X?" — se revisa primero para que no
  // termine cayendo en una consulta de datos por compartir una palabra
  // (ej. "punto de venta" no debe reportar cifras de ventas).
  const faqReply = answerFAQ(text);
  if (faqReply) return faqReply;

  // Salud del sistema / cosas que faltan — se revisa antes que las
  // consultas de datos porque es lo más específico.
  if (/qu[eé] (me )?falta|falta configurar|cosas? (que )?faltan|pendiente(s)? de configurar|salud del sistema/.test(text)) {
    return answerHealthCheck();
  }
  if (/tasa de conversi[oó]n|convers[ií]on/.test(text)) {
    return answerConversionRate();
  }
  if (/inactiv|no ha vuelto|no ha regresado|dej(ó|o) de venir/.test(text)) {
    return answerInactiveCustomers(text);
  }
  if (/cliente(s)? nuevo|nuevos? client/.test(text)) {
    return answerNewCustomers(text);
  }
  if (/cu[aá]ntos client|total de client|client.*en total/.test(text)) {
    return answerTotalCustomers();
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
