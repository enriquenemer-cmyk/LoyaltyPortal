'use client';

import { ArrowPathIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon, BanknotesIcon, BoltIcon, ExclamationTriangleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

type AnalyticsOverview = {
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

function formatCurrency(n: number) {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AnaliticaPage() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/analytics/overview');
        if (!res.ok) throw new Error('Error al cargar datos');
        setData(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ArrowTrendingUpIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Analítica Avanzada
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Analítica Avanzada</h1>
          <p className="text-orange-200/70 mt-1.5 text-sm">Valor de cliente (LTV), retención y rendimiento de campañas</p>
        </div>
      </div>

    <div className="max-w-5xl mx-auto px-4 py-8">
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
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-2xl mb-1"><BanknotesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <div className="text-2xl font-extrabold tabular-nums text-emerald-700">{formatCurrency(data.ltv.avgLifetimeValue)}</div>
              <div className="text-xs text-stone-500 mt-1 leading-tight">LTV promedio por cliente</div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-2xl mb-1"><ArrowPathIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <div className="text-2xl font-extrabold tabular-nums text-orange-700">{data.retention.retentionRate.toFixed(1)}%</div>
              <div className="text-xs text-stone-500 mt-1 leading-tight">Tasa de retencion (2+ visitas)</div>
            </div>
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <div className="text-2xl mb-1"><PlusCircleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <div className="text-2xl font-extrabold tabular-nums text-orange-700">{data.retention.newCustomers30d}</div>
              <div className="text-xs text-stone-500 mt-1 leading-tight">Clientes nuevos (30 dias)</div>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <div className="text-2xl mb-1"><BoltIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <div className="text-2xl font-extrabold tabular-nums text-violet-700">{data.retention.activeCustomers30d}</div>
              <div className="text-xs text-stone-500 mt-1 leading-tight">Clientes activos (30 dias)</div>
            </div>
          </div>

          {/* LTV */}
          <div className="rounded-2xl border border-[#E8E3DC] bg-white overflow-hidden mb-8" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-4 border-b border-[#E8E3DC] flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-widest">Top Clientes por Valor (LTV)</h2>
              <span className="text-xs text-stone-500">
                Ingresos totales: <span className="font-bold text-emerald-700">{formatCurrency(data.ltv.totalRevenue)}</span>
              </span>
            </div>
            {data.ltv.topCustomers.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-10">Sin datos de consumo registrados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8E3DC]">
                      {['Cliente', 'Telefono', 'Total gastado', 'Visitas', 'Ultima visita'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFE9]">
                    {data.ltv.topCustomers.map((c) => (
                      <tr key={c.phone} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#1C1917]">{c.full_name}</td>
                        <td className="px-4 py-3 text-stone-500 font-mono text-xs">{c.phone}</td>
                        <td className="px-4 py-3 tabular-nums font-bold text-emerald-700">{formatCurrency(c.total_spent)}</td>
                        <td className="px-4 py-3 tabular-nums text-stone-600">{c.visits}</td>
                        <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">{formatDate(c.last_visit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Retention */}
          <div className="rounded-2xl border border-[#E8E3DC] bg-white overflow-hidden mb-8" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-4 border-b border-[#E8E3DC]">
              <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-widest">Retencion de Clientes</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#F3EFE9]">
              <div className="p-5">
                <p className="text-xs text-stone-500 mb-1">Clientes totales</p>
                <p className="text-2xl font-extrabold text-[#1C1917] tabular-nums">{data.retention.totalCustomers}</p>
              </div>
              <div className="p-5">
                <p className="text-xs text-stone-500 mb-1">Clientes recurrentes</p>
                <p className="text-2xl font-extrabold text-orange-700 tabular-nums">{data.retention.returningCustomers}</p>
              </div>
              <div className="p-5">
                <p className="text-xs text-stone-500 mb-1">Tasa de retencion</p>
                <p className="text-2xl font-extrabold text-orange-700 tabular-nums">{data.retention.retentionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Win-back */}
          {(data.winback.at_risk > 0 || data.winback.dormant > 0) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-amber-200 flex items-center gap-2">
                <span className="text-lg"><ExclamationTriangleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
                <h2 className="text-sm font-extrabold text-amber-900 uppercase tracking-widest">Clientes en Riesgo</h2>
              </div>
              <div className="grid grid-cols-2 divide-x divide-amber-200">
                <div className="p-5">
                  <p className="text-3xl font-extrabold text-red-700 tabular-nums">{data.winback.at_risk}</p>
                  <p className="text-xs text-stone-500 mt-1">Sin visitar +30 días</p>
                  <a href="/admin/segmentacion" className="inline-block mt-3 text-xs font-semibold text-red-700 underline underline-offset-2">Ver y reactivar →</a>
                </div>
                <div className="p-5">
                  <p className="text-3xl font-extrabold text-amber-700 tabular-nums">{data.winback.dormant}</p>
                  <p className="text-xs text-stone-500 mt-1">Sin visitar 15-30 días</p>
                  <a href="/admin/segmentacion" className="inline-block mt-3 text-xs font-semibold text-amber-700 underline underline-offset-2">Ver segmento →</a>
                </div>
              </div>
            </div>
          )}

          {/* Campaign ROI */}
          <div className="rounded-2xl border border-[#E8E3DC] bg-white overflow-hidden" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div className="px-5 py-4 border-b border-[#E8E3DC]">
              <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-widest">ROI por Campana</h2>
              <p className="text-xs text-stone-400 mt-1">Costo real por cobro — configura el costo del premio en cada campaña</p>
            </div>
            {data.campaigns.length === 0 ? (
              <p className="text-stone-400 text-sm text-center py-10">No hay campanas registradas</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8E3DC]">
                      {['Campana', 'Cobros', 'Conversion', 'Costo/premio', 'Costo total', 'Costo/cobro'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-stone-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EFE9]">
                    {data.campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-orange-50/30 transition-colors">
                        <td className="px-4 py-3 font-semibold text-[#1C1917]">{c.name}</td>
                        <td className="px-4 py-3 tabular-nums font-bold text-orange-700">{c.claims}</td>
                        <td className="px-4 py-3 tabular-nums font-bold text-orange-700">{c.conversionRate.toFixed(1)}%</td>
                        <td className="px-4 py-3 tabular-nums text-stone-600">
                          {c.prizeCost != null ? formatCurrency(c.prizeCost) : <span className="text-stone-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-orange-700 font-semibold">
                          {c.totalCost != null ? formatCurrency(c.totalCost) : <span className="text-stone-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-red-700 font-bold">
                          {c.costPerClaim != null ? formatCurrency(c.costPerClaim) : <span className="text-stone-300 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
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
