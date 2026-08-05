import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/session';
import { getPool, ensureSchema } from '@/lib/db';
import { generateWithTools, ChatMessage, ToolDefinition } from '@/lib/openai';
import {
  getSalesForDateRange,
  getTopCustomers,
  getClaimsCountForDateRange,
  getTopPrizes,
  getInactiveCustomersCount,
  getConversionRate,
  getCurrentInventoryAlerts,
} from '@/lib/aiDataTools';

export const runtime = 'nodejs';

const SYSTEM_PROMPT =
  'Eres un asistente de datos para el dueño de "3E", un restaurante con programa de lealtad. ' +
  'Responde en español, de forma breve y concreta, usando SOLO los datos que obtengas de las herramientas disponibles. ' +
  'Si no tienes una herramienta para responder algo, dilo honestamente. ' +
  'Usa números y porcentajes concretos cuando los tengas.';

const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'getSalesForDateRange',
      description: 'Obtiene el total de ventas, desglose de efectivo/tarjeta/otro y cantidad de tickets para un rango de fechas.',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Fecha de inicio en formato YYYY-MM-DD' },
          endDate: { type: 'string', description: 'Fecha de fin en formato YYYY-MM-DD' },
          restaurantId: { type: 'string', description: 'ID de restaurante opcional para filtrar' },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTopCustomers',
      description: 'Obtiene los mejores clientes ordenados por puntos acumulados de por vida.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Cantidad de clientes a devolver (máximo 50)' },
        },
        required: ['limit'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getClaimsCountForDateRange',
      description: 'Cuenta los cobros/canjes de premios en un rango de fechas, desglosados por estado.',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Fecha de inicio en formato YYYY-MM-DD' },
          endDate: { type: 'string', description: 'Fecha de fin en formato YYYY-MM-DD' },
        },
        required: ['startDate', 'endDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTopPrizes',
      description: 'Obtiene los premios más canjeados en los últimos 30 días.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Cantidad de premios a devolver (máximo 50)' },
        },
        required: ['limit'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getInactiveCustomersCount',
      description: 'Cuenta cuántos clientes no han hecho un cobro/visita en N días.',
      parameters: {
        type: 'object',
        properties: {
          daysThreshold: { type: 'number', description: 'Cantidad de días sin actividad' },
        },
        required: ['daysThreshold'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getConversionRate',
      description: 'Obtiene la tasa de conversión: premios generados vs. canjeados en los últimos 30 días.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCurrentInventoryAlerts',
      description: 'Obtiene los productos de inventario que están por debajo de su nivel mínimo de stock.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

const MAX_DAYS_RANGE = 366;

function clampDate(dateStr: unknown): string {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date().toISOString().slice(0, 10);
  }
  return dateStr;
}

function clampLimit(n: unknown, fallback = 5): number {
  const num = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.min(Math.floor(num), 50);
}

async function executeTool(name: string, rawArgs: string): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(rawArgs || '{}');
  } catch {
    args = {};
  }

  switch (name) {
    case 'getSalesForDateRange': {
      const start = clampDate(args.startDate);
      const end = clampDate(args.endDate);
      const startD = new Date(start);
      const endD = new Date(end);
      const diffDays = Math.abs((endD.getTime() - startD.getTime()) / 86400000);
      if (diffDays > MAX_DAYS_RANGE) {
        return { error: 'Rango de fechas demasiado amplio (máximo 366 días).' };
      }
      const restaurantId = typeof args.restaurantId === 'string' ? args.restaurantId : undefined;
      return getSalesForDateRange(start, end, restaurantId);
    }
    case 'getTopCustomers':
      return getTopCustomers(clampLimit(args.limit));
    case 'getClaimsCountForDateRange': {
      const start = clampDate(args.startDate);
      const end = clampDate(args.endDate);
      const startD = new Date(start);
      const endD = new Date(end);
      const diffDays = Math.abs((endD.getTime() - startD.getTime()) / 86400000);
      if (diffDays > MAX_DAYS_RANGE) {
        return { error: 'Rango de fechas demasiado amplio (máximo 366 días).' };
      }
      return getClaimsCountForDateRange(start, end);
    }
    case 'getTopPrizes':
      return getTopPrizes(clampLimit(args.limit));
    case 'getInactiveCustomersCount': {
      const days = clampLimit(args.daysThreshold, 30);
      return getInactiveCustomersCount(Math.min(days, 730) || 30);
    }
    case 'getConversionRate':
      return getConversionRate();
    case 'getCurrentInventoryAlerts':
      return getCurrentInventoryAlerts();
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
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
    // Cargar historial reciente de la conversación
    const historyResult = await pool.query<{ role: 'user' | 'assistant'; content: string }>(
      `SELECT role, content FROM ai_chat_messages
       WHERE session_id = $1 AND role IN ('user', 'assistant')
       ORDER BY created_at DESC
       LIMIT 10`,
      [sessionId]
    );
    const history = historyResult.rows.reverse();

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((h) => ({ role: h.role, content: h.content } as ChatMessage)),
      { role: 'user', content: userMessage },
    ];

    const usedTools: string[] = [];

    // Primera llamada: GPT decide si necesita herramientas
    const first = await generateWithTools(messages, TOOLS);
    let finalContent = first.message.content ?? '';

    if (first.message.tool_calls && first.message.tool_calls.length > 0) {
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: first.message.content ?? null,
        tool_calls: first.message.tool_calls,
      };
      messages.push(assistantMsg);

      for (const call of first.message.tool_calls) {
        const result = await executeTool(call.function.name, call.function.arguments);
        usedTools.push(call.function.name);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(result),
        });
      }

      // Segunda llamada: GPT resume los resultados en español natural
      const second = await generateWithTools(messages, TOOLS);
      finalContent = second.message.content ?? '';
    }

    if (!finalContent.trim()) {
      finalContent = 'No pude generar una respuesta en este momento. Intenta reformular tu pregunta.';
    }

    // Guardar mensajes en el historial
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

    return NextResponse.json({ reply: finalContent, used_tools: usedTools });
  } catch (err) {
    console.error('[/api/admin/ai/chat POST]', err);
    const message = err instanceof Error ? err.message : '';
    const isQuota = /quota|429|insufficient/i.test(message);
    const fallback = isQuota
      ? 'El servicio de IA alcanzó su límite de uso. Intenta de nuevo más tarde.'
      : 'Ocurrió un error al consultar el asistente de datos. Intenta de nuevo.';
    return NextResponse.json({ error: fallback }, { status: 500 });
  }
}
