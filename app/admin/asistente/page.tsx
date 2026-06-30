'use client';

import { useEffect, useRef, useState } from 'react';

type ChatRole = 'user' | 'assistant';

type ChatBubble = {
  id: string;
  role: ChatRole;
  content: string;
  usedTools?: string[];
  isError?: boolean;
};

const STARTER_QUESTIONS = [
  '¿Cuánto vendí esta semana?',
  '¿Quién es mi mejor cliente?',
  '¿Qué premio se canjea más?',
  '¿Tengo productos con poco stock?',
  '¿Cuál es mi tasa de conversión?',
];

const TOOL_LABELS: Record<string, string> = {
  getSalesForDateRange: 'ventas',
  getTopCustomers: 'clientes',
  getClaimsCountForDateRange: 'cobros',
  getTopPrizes: 'premios',
  getInactiveCustomersCount: 'inactividad',
  getConversionRate: 'conversión',
  getCurrentInventoryAlerts: 'inventario',
};

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AsistentePage() {
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSessionId(genId());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || !sessionId) return;

    const userBubble: ChatBubble = { id: genId(), role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userBubble]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, session_id: sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: 'assistant',
            content: data.error || 'Ocurrió un error al consultar el asistente.',
            isError: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: 'assistant',
            content: data.reply,
            usedTools: data.used_tools,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          role: 'assistant',
          content: 'No se pudo conectar con el asistente. Intenta de nuevo.',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Hero banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-6 py-8 shadow-lg">
        <div className="text-4xl mb-2">🤖</div>
        <h1 className="text-2xl font-bold">Asistente de Datos</h1>
        <p className="text-white/90 mt-1">Pregúntale lo que quieras sobre tu negocio</p>
      </div>

      {/* Chat container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[60vh] min-h-[420px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <p className="text-gray-500 mb-4">Empieza con una pregunta o elige una sugerencia:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors border border-indigo-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%] flex flex-col gap-1">
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : m.isError
                        ? 'bg-red-50 text-red-700 border border-red-100 rounded-bl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {m.content}
                </div>
                {m.usedTools && m.usedTools.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    <span className="text-[11px] text-gray-400">
                      📊 Consultó: {m.usedTools.map((t) => TOOL_LABELS[t] ?? t).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-gray-100 p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full bg-indigo-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
