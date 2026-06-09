'use client';

import { useEffect, useState } from 'react';

type CashierPerformance = {
  delivered_by: string;
  count: number;
  avg_delivery_time_hours: number | null;
  last_delivery: string | null;
};

type Range = 'today' | 'week' | 'month';

const RANGE_LABELS: Record<Range, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

function formatTime(hours: number | null): string {
  if (hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} dias`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function DeliveryTimeBadge({ hours }: { hours: number | null }) {
  if (hours === null) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-500">
        {formatTime(null)}
      </span>
    );
  }
  if (hours < 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
        {formatTime(hours)}
      </span>
    );
  }
  if (hours <= 24) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        {formatTime(hours)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      {formatTime(hours)}
    </span>
  );
}

const MEDALS = ['', '', ''];

export default function RendimientoPage() {
  const [range, setRange] = useState<Range>('week');
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [performance, setPerformance] = useState<CashierPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((d) => {
        const list = d.restaurants ?? [];
        setRestaurants(list);
        if (list.length > 0) setRestaurantId(list[0].id);
      })
      .catch(() => setError('No se pudieron cargar los restaurantes.'));
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');
    fetch(`/api/cashier-performance?restaurant_id=${restaurantId}&range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPerformance(d.performance ?? []);
      })
      .catch((e) => setError(e.message ?? 'Error al cargar datos.'))
      .finally(() => setLoading(false));
  }, [restaurantId, range]);

  return (
    <div className="min-h-screen admin-bg">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4"
            style={{ background: 'rgba(232,82,26,0.10)', border: '1px solid rgba(232,82,26,0.25)', color: '#E8521A' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Equipo
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight border-l-4 border-[#E8521A] pl-4">
            Rendimiento del{' '}
            <span className="gradient-text">Equipo</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Premios entregados y tiempos promedio por cajero
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5 mb-6 flex flex-wrap gap-4 items-center">
          {/* Restaurant selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Restaurante
            </label>
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              className="w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Range selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Periodo
            </label>
            <div className="flex gap-1 bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl p-1">
              {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    range === r
                      ? 'bg-white text-[#E8521A] shadow-sm border border-[#E8E3DC]'
                      : 'text-stone-500 hover:text-gray-900'
                  }`}
                >
                  {RANGE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
            <span className="text-stone-500">Rapido (&lt; 2 hrs)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            <span className="text-stone-500">Medio (2–24 hrs)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="text-stone-500">Lento (&gt; 24 hrs)</span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
          {error && (
            <div className="bg-red-50 border-b border-red-200 text-red-700 px-5 py-3 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="spinner-brand spinner-lg" />
              <p className="text-gray-400 text-sm">Cargando rendimiento...</p>
            </div>
          ) : performance.length === 0 ? (
            <div className="text-center py-20">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(232,82,26,0.10)' }}
              >
                <svg className="w-8 h-8 text-[#E8521A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Sin datos en este periodo</h3>
              <p className="text-gray-400 text-sm">No hay entregas registradas para este restaurante y periodo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E8E3DC] bg-[#FAFAF9]">
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-stone-400 uppercase tracking-widest">#</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-stone-400 uppercase tracking-widest">Cajero</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-stone-400 uppercase tracking-widest">Premios entregados</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-stone-400 uppercase tracking-widest">Tiempo promedio de entrega</th>
                    <th className="text-left px-5 py-3.5 text-xs font-bold text-stone-400 uppercase tracking-widest">Ultimo premio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E3DC]">
                  {performance.map((row, idx) => (
                    <tr key={row.delivered_by} className="hover:bg-[#FAFAF9] transition-colors">
                      <td className="px-5 py-4">
                        {idx < 3 ? (
                          <span className="text-xl" title={`#${idx + 1}`}>{MEDALS[idx]}</span>
                        ) : (
                          <span className="text-sm font-bold text-stone-400">{idx + 1}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                            style={{ background: 'linear-gradient(135deg,#E8521A,#C2410C)' }}
                          >
                            {row.delivered_by.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-[#1C1917] text-sm">{row.delivered_by}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-2xl font-black"
                            style={{ color: '#E8521A' }}
                          >
                            {row.count}
                          </span>
                          <span className="text-stone-400 text-xs">
                            premio{row.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <DeliveryTimeBadge hours={row.avg_delivery_time_hours} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-stone-500 text-xs">{formatDate(row.last_delivery)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary stats */}
        {performance.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Total entregados</p>
              <p className="text-3xl font-black text-[#E8521A]">
                {performance.reduce((s, r) => s + r.count, 0)}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Cajeros activos</p>
              <p className="text-3xl font-black text-[#1C1917]">{performance.length}</p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-1">Lider del periodo</p>
              <p className="text-xl font-black text-[#1C1917] truncate">{performance[0]?.delivered_by ?? '—'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
