'use client';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';

type GlobalKPI = {
  cobros_hoy: number;
  cobros_semana: number;
  clientes_unicos: number;
  ticket_promedio: number;
};

type Sucursal = {
  restaurant_id: string;
  restaurant_name: string;
  cobros_hoy: number;
  cobros_semana: number;
  clientes_unicos: number;
  ultimo_cobro: string | null;
};

type CorporativoData = {
  global: GlobalKPI;
  sucursales: Sucursal[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function weekStartISO() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function isActive(ultimo_cobro: string | null): boolean {
  if (!ultimo_cobro) return false;
  const diff = Date.now() - new Date(ultimo_cobro).getTime();
  return diff < 1000 * 60 * 60 * 24 * 7; // active = cobro within last 7 days
}

export default function CorporativoPage() {
  const [data, setData] = useState<CorporativoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(weekStartISO());
  const [to, setTo] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  async function load(f: string, t: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (f) params.set('from', f);
      if (t) params.set('to', t);
      const res = await fetch(`/api/corporativo?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(from, to); }, []);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    load(from, to);
  }

  function exportCSV() {
    if (!data) return;
    const headers = ['Sucursal', 'Cobros hoy', 'Cobros semana', 'Clientes únicos', 'Último cobro', 'Estado'];
    const rows = data.sucursales.map((s) => [
      s.restaurant_name,
      s.cobros_hoy,
      s.cobros_semana,
      s.clientes_unicos,
      formatDateTime(s.ultimo_cobro),
      isActive(s.ultimo_cobro) ? 'Activo' : 'Inactivo',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corporativo-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const maxBar = data ? Math.max(...data.sucursales.map((s) => s.cobros_semana), 1) : 1;

  const kpiCards = data
    ? [
        { label: 'Cobros hoy', value: data.global.cobros_hoy, icon: '', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
        { label: 'Cobros esta semana', value: data.global.cobros_semana, icon: '', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
        { label: 'Clientes únicos', value: data.global.clientes_unicos, icon: '', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
        {
          label: 'Ticket promedio',
          value: `$${data.global.ticket_promedio.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          icon: '', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200',
        },
      ]
    : [];

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <BuildingOfficeIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Vista Corporativa
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Vista Corporativa</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">
              {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={!data}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{ background: 'white', color: '#111111', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Date filter */}
      <form onSubmit={handleFilter} className="mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white text-[#1C1917] focus:outline-none focus:border-[#F97316]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-widest mb-1">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white text-[#1C1917] focus:outline-none focus:border-[#F97316]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: '#EA580C' }}
        >
          Filtrar
        </button>
      </form>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <svg className="animate-spin w-8 h-8 text-[#1a6b3c]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {kpiCards.map((k) => (
              <div key={k.label} className={`rounded-2xl border ${k.border} ${k.bg} p-4`}>
                <div className="text-2xl mb-1">{k.icon}</div>
                <div className={`text-2xl font-extrabold tabular-nums ${k.color}`}>{k.value}</div>
                <div className="text-xs text-stone-500 mt-1 leading-tight">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          {data.sucursales.length > 0 && (
            <div className="rounded-2xl border border-[#E8E3DC] bg-white p-6 mb-8" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-widest mb-5">Cobros por Sucursal (semana)</h2>
              <div className="space-y-3">
                {data.sucursales.map((s) => {
                  const pct = maxBar > 0 ? Math.round((s.cobros_semana / maxBar) * 100) : 0;
                  return (
                    <div key={s.restaurant_id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#1C1917] truncate max-w-[60%]">{s.restaurant_name}</span>
                        <span className="text-xs font-bold text-orange-700 tabular-nums">{s.cobros_semana}</span>
                      </div>
                      <div className="h-2.5 bg-orange-50 rounded-full overflow-hidden border border-orange-100">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#F97316,#EA580C)' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comparison table */}
          <div className="rounded-2xl border border-[#E8E3DC] bg-white overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-4 border-b border-[#E8E3DC]">
              <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-widest">Detalle por Sucursal</h2>
            </div>
            {data.sucursales.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-10">No hay sucursales registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8E3DC]">
                      {['Sucursal', 'Cobros hoy', 'Cobros semana', 'Clientes únicos', 'Último cobro', 'Estado'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFE9]">
                    {data.sucursales.map((s) => {
                      const active = isActive(s.ultimo_cobro);
                      return (
                        <tr key={s.restaurant_id} className="hover:bg-orange-50/30 transition-colors">
                          <td className="px-4 py-3 font-semibold text-[#1C1917] text-sm">{s.restaurant_name}</td>
                          <td className="px-4 py-3 tabular-nums font-bold text-orange-700">{s.cobros_hoy}</td>
                          <td className="px-4 py-3 tabular-nums font-bold text-orange-700">{s.cobros_semana}</td>
                          <td className="px-4 py-3 tabular-nums text-stone-600">{s.clientes_unicos}</td>
                          <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{formatDateTime(s.ultimo_cobro)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-400 border border-stone-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-stone-300'}`} />
                              {active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
    </div>
  );
}
