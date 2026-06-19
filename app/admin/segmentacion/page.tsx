'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type SegmentCustomer = {
  phone: string;
  full_name: string;
  last_visit: string;
  days_since_visit: number;
  total_cobros: number;
};

type Segment = {
  id: 'en_riesgo' | 'dormidos' | 'activos' | 'vip';
  label: string;
  emoji: string;
  color: string;
  count: number;
  customers: SegmentCustomer[];
};

const SEGMENT_DESCRIPTIONS: Record<string, string> = {
  en_riesgo: 'No visitan hace más de 30 días',
  dormidos: 'No visitan hace 15 a 30 días',
  activos: 'Visitaron en los últimos 15 días',
  vip: 'Más de 5 cobros en total',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function exportCSV(customers: SegmentCustomer[], segmentLabel: string) {
  const header = 'Nombre,Teléfono,Último cobro,Días sin visitar,Total cobros';
  const rows = customers.map((c) =>
    [
      `"${c.full_name}"`,
      c.phone,
      formatDate(c.last_visit),
      c.days_since_visit,
      c.total_cobros,
    ].join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `segmento-${segmentLabel.replace(/\s+/g, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SegmentacionPage() {
  const router = useRouter();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [winbackSending, setWinbackSending] = useState(false);
  const [winbackResult, setWinbackResult] = useState<string | null>(null);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/segmentacion');
      if (!res.ok) throw new Error('Error al cargar segmentos');
      const data = await res.json();
      setSegments(data.segments ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  function handleSegmentClick(seg: Segment) {
    setActiveSegment((prev) => (prev?.id === seg.id ? null : seg));
  }

  function handleCampaign(seg: Segment) {
    router.push(`/admin/campanas?segmento=${seg.id}`);
  }

  async function handleWinback(seg: Segment) {
    if (!['en_riesgo', 'dormidos'].includes(seg.id)) return;
    if (!confirm(`¿Generar un premio de reactivación para los ${seg.count} clientes "${seg.label}"?`)) return;
    setWinbackSending(true);
    setWinbackResult(null);
    try {
      const res = await fetch('/api/analytics/winback-prizes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segment: seg.id,
          prize_name: 'Premio de reactivación',
          prize_description: '¡Te extrañamos! Vuelve a visitarnos y canjea este premio.',
          validity_days: 14,
        }),
      });
      const d = await res.json();
      setWinbackResult(`✓ ${d.generated} premios generados para el segmento "${seg.label}"`);
    } catch {
      setWinbackResult('Error al generar premios');
    } finally {
      setWinbackSending(false);
    }
  }

  const segmentBorderColor: Record<string, string> = {
    en_riesgo: 'border-red-400',
    dormidos: 'border-amber-400',
    activos: 'border-emerald-400',
    vip: 'border-blue-500',
  };

  const segmentBgColor: Record<string, string> = {
    en_riesgo: 'bg-red-50',
    dormidos: 'bg-amber-50',
    activos: 'bg-emerald-50',
    vip: 'bg-blue-50',
  };

  const segmentTextColor: Record<string, string> = {
    en_riesgo: 'text-red-700',
    dormidos: 'text-amber-700',
    activos: 'text-emerald-700',
    vip: 'text-blue-700',
  };

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0] px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-[#1C1917] tracking-tight">
            Segmentación de Clientes
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Clasifica automáticamente tu base de clientes y activa campañas dirigidas
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-stone-500">Calculando segmentos...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Segment cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {segments.map((seg) => {
                const isActive = activeSegment?.id === seg.id;
                return (
                  <button
                    key={seg.id}
                    onClick={() => handleSegmentClick(seg)}
                    className={`text-left rounded-2xl border-2 p-5 transition-all shadow-sm hover:shadow-md cursor-pointer ${
                      isActive
                        ? `${segmentBorderColor[seg.id]} ${segmentBgColor[seg.id]}`
                        : 'border-[#E2E8F0] bg-white hover:border-[#2563EB]/30'
                    }`}
                  >
                    <div className="text-2xl mb-2">{seg.emoji}</div>
                    <div
                      className={`text-3xl font-bold ${
                        isActive ? segmentTextColor[seg.id] : 'text-[#1C1917]'
                      }`}
                    >
                      {seg.count}
                    </div>
                    <div className="text-sm font-semibold text-[#1C1917] mt-0.5">{seg.label}</div>
                    <div className="text-xs text-stone-400 mt-1 leading-snug">
                      {SEGMENT_DESCRIPTIONS[seg.id]}
                    </div>
                    {isActive && (
                      <div
                        className="mt-3 text-xs font-semibold px-2 py-1 rounded-full inline-block"
                        style={{ background: seg.color, color: '#fff' }}
                      >
                        Seleccionado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Customer list */}
            {activeSegment && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
                {/* List header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
                  <div>
                    <h2 className="text-base font-bold text-[#1C1917]">
                      {activeSegment.emoji} {activeSegment.label}
                      <span className="ml-2 text-sm font-normal text-stone-400">
                        ({activeSegment.count} clientes)
                      </span>
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {SEGMENT_DESCRIPTIONS[activeSegment.id]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => exportCSV(activeSegment.customers, activeSegment.label)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Exportar CSV
                    </button>
                    {['en_riesgo', 'dormidos'].includes(activeSegment.id) && (
                      <button
                        onClick={() => handleWinback(activeSegment)}
                        disabled={winbackSending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #dc2626, #ea580c)' }}
                      >
                        {winbackSending ? (
                          <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        {winbackSending ? 'Generando...' : 'Generar premio win-back'}
                      </button>
                    )}
                    <button
                      onClick={() => handleCampaign(activeSegment)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                      style={{ background: 'linear-gradient(135deg, #2563EB, #0891B2)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                      Enviar campaña
                    </button>
                  </div>
                  {winbackResult && (
                    <div className="mt-2 px-6 pb-2 text-xs text-emerald-700 font-semibold">{winbackResult}</div>
                  )}
                </div>

                {activeSegment.customers.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 text-sm">
                    No hay clientes en este segmento aún.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-[#E2E8F0]">
                          <th className="px-6 py-3">Nombre</th>
                          <th className="px-6 py-3">Teléfono</th>
                          <th className="px-6 py-3">Último cobro</th>
                          <th className="px-6 py-3">Días sin visitar</th>
                          <th className="px-6 py-3">Total cobros</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeSegment.customers.map((c, idx) => (
                          <tr
                            key={c.phone + idx}
                            className="border-b border-[#F1F5F9] hover:bg-[#F8FAFF] transition-colors"
                          >
                            <td className="px-6 py-3 font-medium text-[#1C1917]">{c.full_name}</td>
                            <td className="px-6 py-3 text-stone-500 font-mono text-xs">{c.phone}</td>
                            <td className="px-6 py-3 text-stone-500">{formatDate(c.last_visit)}</td>
                            <td className="px-6 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  c.days_since_visit > 30
                                    ? 'bg-red-100 text-red-700'
                                    : c.days_since_visit >= 15
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {c.days_since_visit}d
                              </span>
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  c.total_cobros > 5
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-stone-100 text-stone-600'
                                }`}
                              >
                                {c.total_cobros}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
