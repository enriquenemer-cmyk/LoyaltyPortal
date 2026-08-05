'use client';
import { ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

import { useEffect, useMemo, useState } from 'react';
import ActivityChart from '@/app/components/ActivityChart';
import { SkeletonCard, SkeletonTable } from '@/app/components/Skeleton';
import { EmptyState } from '@/app/components/EmptyState';
import { useToast } from '@/app/components/Toast';

type Sale = {
  id: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  sale_date: string;
  cash_amount: string;
  card_amount: string;
  other_amount: string;
  total_amount: string;
  ticket_count: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type Restaurant = { id: string; name: string };

type Summary = {
  today: number;
  week: number;
  month: number;
  weekChangePct: number | null;
  monthChangePct: number | null;
  last14Days: { date: string; total: number }[];
  paymentBreakdown?: { cash: number; card: number; other: number };
  bestDayOfWeek?: { name: string; average: number } | null;
};

const PAGE_SIZE = 15;

function formatCurrency(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
}

function formatDateShort(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function WeeklyComparisonWidget({ summary }: { summary: Summary | null }) {
  const changePct = summary?.weekChangePct ?? null;
  const direction = changePct === null ? 'flat' : changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';
  const arrowColor = direction === 'up' ? '#059669' : direction === 'down' ? '#dc2626' : '#a8a29e';
  const arrowLabel = changePct === null
    ? '— Sin datos previos'
    : direction === 'up'
      ? `▲ +${changePct.toFixed(1)}%`
      : direction === 'down'
        ? `▼ ${changePct.toFixed(1)}%`
        : '= 0%';

  // last week total = current week total minus implied delta; derive from last14Days if possible
  const lastWeekApprox = summary && changePct !== null && changePct !== -100
    ? summary.week / (1 + changePct / 100)
    : null;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 flex flex-col gap-4 shadow-sm">
      <div>
        <h2 className="text-sm font-bold text-[#1C1917]">Esta semana vs semana anterior</h2>
        <p className="text-xs text-[#a8a29e] mt-0.5">Comparativa de ventas totales</p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-end gap-3">
          <span className="text-3xl font-black text-[#1C1917]">{formatCurrency(summary?.week ?? 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black" style={{ color: arrowColor }}>{arrowLabel}</span>
        </div>
        {lastWeekApprox !== null && (
          <p className="text-xs text-[#a8a29e]">
            vs semana anterior: <span className="font-semibold text-[#78716c]">{formatCurrency(lastWeekApprox)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function PaymentMethodCards({ breakdown }: { breakdown?: { cash: number; card: number; other: number } }) {
  const cash = breakdown?.cash ?? 0;
  const card = breakdown?.card ?? 0;
  const other = breakdown?.other ?? 0;
  const total = cash + card + other;

  const methods = [
    { label: 'Efectivo', value: cash, icon: '', color: '#059669', bg: '#d1fae5' },
    { label: 'Tarjeta', value: card, icon: '', color: '#2563EB', bg: '#dbeafe' },
    { label: 'Otros', value: other, icon: '', color: '#7c3aed', bg: '#ede9fe' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {methods.map((m) => {
        const pct = total > 0 ? Math.round((m.value / total) * 100) : 0;
        return (
          <div
            key={m.label}
            className="bg-white rounded-2xl border border-[#E8E3DC] p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: m.bg }}>
              {m.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">{m.label} (mes)</p>
              <p className="text-xl font-extrabold" style={{ color: m.color }}>{formatCurrency(m.value)}</p>
              <p className="text-xs text-stone-400 mt-0.5">{pct}% del total</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BestDayInsight({ bestDay }: { bestDay?: { name: string; average: number } | null }) {
  if (!bestDay) return null;
  return (
    <div
      className="rounded-2xl border border-orange-200 bg-orange-50 p-5 flex items-center gap-4"
      style={{ boxShadow: '0 1px 2px rgba(37,99,235,0.04), 0 4px 12px rgba(37,99,235,0.08)' }}
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ background: '#dbeafe' }}>
        <ArrowTrendingUpIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-orange-700 uppercase tracking-widest mb-0.5">Mejor día de la semana</p>
        <p className="text-base font-black text-blue-900 leading-snug">
          <span style={{ color: '#2563EB' }}>{bestDay.name}</span> es tu día más fuerte, con un promedio de {formatCurrency(bestDay.average)} en ventas
        </p>
      </div>
    </div>
  );
}

function ChangeBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return <span className="text-[10px] font-bold text-stone-400">Sin datos previos</span>;
  }
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        up ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function RegistrarVentaModal({
  restaurants,
  onClose,
  onSaved,
}: {
  restaurants: Restaurant[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [restaurantId, setRestaurantId] = useState(restaurants[0]?.id ?? '');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [other, setOther] = useState('');
  const [tickets, setTickets] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const total = (Number(cash) || 0) + (Number(card) || 0) + (Number(other) || 0);

  async function handleSave() {
    if (!restaurantId) {
      toast.error('Selecciona un restaurante.');
      return;
    }
    if (!saleDate) {
      toast.error('Selecciona una fecha.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          sale_date: saleDate,
          cash_amount: Number(cash) || 0,
          card_amount: Number(card) || 0,
          other_amount: Number(other) || 0,
          ticket_count: Number(tickets) || 0,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al guardar');
      }
      toast.success('Venta registrada correctamente.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la venta.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#E8E3DC] pop-in">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-100 uppercase tracking-widest mb-0.5">Nueva venta</p>
            <h2 className="text-white font-extrabold text-base leading-tight">Registrar Venta</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Restaurante</label>
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
            >
              <option value="">Selecciona un restaurante</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Fecha</label>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Efectivo</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Tarjeta</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={card}
                onChange={(e) => setCard(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Otros</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5"># de Tickets</label>
            <input
              type="number"
              min="0"
              step="1"
              value={tickets}
              onChange={(e) => setTickets(e.target.value)}
              placeholder="0"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas opcionales..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all resize-none"
            />
          </div>

          <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Total</span>
            <span className="text-lg font-black text-orange-700">{formatCurrency(total)}</span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-3 rounded-xl transition-all text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}
          >
            {saving ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Guardando...
              </>
            ) : (
              'Guardar Venta'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);

  async function fetchSales() {
    try {
      const res = await fetch('/api/admin/sales');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSales(data.sales ?? []);
    } catch {
      setError('No se pudieron cargar las ventas.');
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch('/api/admin/sales/summary');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data);
    } catch {
      // summary is non-critical for the table view
    }
  }

  async function fetchRestaurants() {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      if (data.restaurants) setRestaurants(data.restaurants);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    Promise.all([fetchSales(), fetchSummary(), fetchRestaurants()]).finally(() => setLoading(false));
  }, []);

  function handleSaved() {
    fetchSales();
    fetchSummary();
  }

  const chartData = useMemo(() => {
    if (!summary) return [];
    return summary.last14Days.map((d) => ({ day: d.date, count: Math.round(d.total) }));
  }, [summary]);

  const paginated = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));

  return (
    <div className="min-h-screen">
      {showModal && (
        <RegistrarVentaModal
          restaurants={restaurants}
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <BanknotesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Control de Caja
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Ventas Diarias</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Control y registro de ventas por sucursal</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all"
            style={{ background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Registrar Venta
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">

        {/* KPI cards */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <div
              className="bg-white rounded-2xl border border-[#E8E3DC] border-l-4 p-5 flex items-center gap-4"
              style={{ borderLeftColor: '#2563EB', boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: '#dbeafe' }}><CalendarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Hoy</p>
                <p className="text-2xl font-extrabold" style={{ color: '#2563EB' }}>{formatCurrency(summary?.today ?? 0)}</p>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl border border-[#E8E3DC] border-l-4 p-5 flex items-center gap-4"
              style={{ borderLeftColor: '#0EA5E9', boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: '#e0f2fe' }}><ChartBarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Esta semana</p>
                <p className="text-2xl font-extrabold" style={{ color: '#0EA5E9' }}>{formatCurrency(summary?.week ?? 0)}</p>
                <div className="mt-1"><ChangeBadge pct={summary?.weekChangePct ?? null} /></div>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl border border-[#E8E3DC] border-l-4 p-5 flex items-center gap-4"
              style={{ borderLeftColor: '#7c3aed', boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: '#ede9fe' }}><CalendarDaysIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">Este mes</p>
                <p className="text-2xl font-extrabold" style={{ color: '#7c3aed' }}>{formatCurrency(summary?.month ?? 0)}</p>
                <div className="mt-1"><ChangeBadge pct={summary?.monthChangePct ?? null} /></div>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5 mb-8">
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Últimos 14 días</p>
          {loading ? (
            <div className="h-20 flex items-center justify-center text-stone-300 text-xs">Cargando gráfica...</div>
          ) : chartData.length > 0 ? (
            <ActivityChart data={chartData} />
          ) : (
            <div className="h-20 flex items-center justify-center text-stone-300 text-xs">Sin datos suficientes</div>
          )}
        </div>

        {/* Reporting section */}
        {!loading && summary && (
          <div className="flex flex-col gap-6 mb-8">
            <BestDayInsight bestDay={summary.bestDayOfWeek} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WeeklyComparisonWidget summary={summary} />
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Por método de pago (mes)</p>
                <PaymentMethodCards breakdown={summary.paymentBreakdown} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Table */}
        {loading ? (
          <SkeletonTable rows={8} />
        ) : sales.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
            <EmptyState
              icon="search"
              title="Sin ventas registradas"
              description="Registra tu primera venta diaria para comenzar a ver el resumen."
              action={{ label: '+ Registrar Venta', onClick: () => setShowModal(true) }}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Restaurante</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Efectivo</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Tarjeta</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Otros</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Total</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Tickets</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Registrado por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE4]">
                  {paginated.map((s) => (
                    <tr key={s.id} className="hover:bg-[#faf7f5] transition-colors">
                      <td className="px-5 py-4 text-stone-700 text-xs whitespace-nowrap font-medium">{formatDateShort(s.sale_date)}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{s.restaurant_name || '—'}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{formatCurrency(Number(s.cash_amount))}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{formatCurrency(Number(s.card_amount))}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{formatCurrency(Number(s.other_amount))}</td>
                      <td className="px-5 py-4 text-orange-700 text-xs font-bold">{formatCurrency(Number(s.total_amount))}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{s.ticket_count}</td>
                      <td className="px-5 py-4 text-stone-400 text-xs">{s.created_by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {sales.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sales.length)} de {sales.length}
                </span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border disabled:opacity-40 hover:bg-slate-50 transition-colors">
                    ← Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - page) <= 1)
                    .map((p) => (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg border transition-colors ${p === page ? 'bg-orange-500 text-white border-orange-500' : 'hover:bg-slate-50'}`}>
                        {p}
                      </button>
                    ))}
                  <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border disabled:opacity-40 hover:bg-slate-50 transition-colors">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
