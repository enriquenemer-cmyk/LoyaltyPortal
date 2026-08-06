'use client';
import { CpuChipIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type InactiveCustomer = {
  phone: string;
  email: string;
  full_name: string;
  last_claim_date: string;
  days_inactive: number;
  wa_url: string;
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function DaysChip({ days }: { days: number }) {
  const color = days >= 90
    ? 'bg-red-50 text-red-700 border-red-200'
    : days >= 60
    ? 'bg-orange-50 text-orange-700 border-orange-200'
    : 'bg-yellow-50 text-yellow-700 border-yellow-200';
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
      {days}d inactivo
    </span>
  );
}

export default function AutomatizacionPage() {
  const [customers, setCustomers] = useState<InactiveCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [daysThreshold, setDaysThreshold] = useState(30);
  const [pendingDays, setPendingDays] = useState(30);
  const [total, setTotal] = useState(0);

  async function fetchInactive(days: number) {
    setLoading(true);
    try {
      const res = await fetch('/api/automation/inactive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers ?? []);
        setTotal(data.total ?? 0);
        setDaysThreshold(days);
        setLoaded(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInactive(30);
  }, []);

  function handleSendAll() {
    if (customers.length === 0) return;
    const confirmed = window.confirm(
      `Vas a abrir ${customers.length} links de WhatsApp. ¿Continuar?`
    );
    if (!confirmed) return;
    customers.forEach((c, i) => {
      setTimeout(() => window.open(c.wa_url, '_blank'), i * 400);
    });
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-6xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CpuChipIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Automatización
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Automatización</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Gestiona campañas de reactivación y mensajes automáticos.</p>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 md:px-10 py-6">

        {/* Section 1: Clientes Inactivos */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E3DC] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Clientes Inactivos</h2>
              {loaded && (
                <p className="text-xs text-stone-400 mt-0.5">
                  {total} {total === 1 ? 'cliente' : 'clientes'} sin visita en más de {daysThreshold} días
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Days filter */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide whitespace-nowrap">Sin visita &gt;</label>
                <select
                  value={pendingDays}
                  onChange={(e) => setPendingDays(Number(e.target.value))}
                  className="text-sm border border-[#E8E3DC] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value={14}>14 días</option>
                  <option value={30}>30 días</option>
                  <option value={60}>60 días</option>
                  <option value={90}>90 días</option>
                </select>
                <button
                  onClick={() => fetchInactive(pendingDays)}
                  disabled={loading}
                  className="text-sm font-bold px-3 py-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Cargando…' : 'Filtrar'}
                </button>
              </div>
              {/* Send all */}
              {customers.length > 0 && (
                <button
                  onClick={handleSendAll}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Enviar a todos ({customers.length})
                </button>
              )}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16 text-stone-400 gap-3">
              <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              Cargando clientes inactivos…
            </div>
          )}

          {!loading && loaded && customers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-stone-400 gap-2">
              <svg className="w-10 h-10 text-stone-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="font-medium text-stone-500">No hay clientes inactivos</p>
              <p className="text-xs">Todos los clientes han visitado en los últimos {daysThreshold} días.</p>
            </div>
          )}

          {!loading && customers.length > 0 && (
            <div className="divide-y divide-[#F0EDE8]">
              {customers.map((c) => (
                <div key={c.phone} className="flex items-center gap-4 px-6 py-4 hover:bg-[#faf7f5] transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0 text-sm font-bold text-orange-600">
                    {c.full_name.charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 text-sm truncate">{c.full_name}</p>
                    <p className="text-xs text-stone-400 font-mono">{c.phone}</p>
                  </div>
                  {/* Last visit */}
                  <div className="hidden sm:block text-right">
                    <p className="text-xs text-stone-400">Última visita</p>
                    <p className="text-xs font-semibold text-stone-600">{formatDate(c.last_claim_date)}</p>
                  </div>
                  {/* Days chip */}
                  <div className="hidden sm:block">
                    <DaysChip days={c.days_inactive} />
                  </div>
                  {/* WhatsApp button */}
                  <a
                    href={c.wa_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Enviar WhatsApp
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Reglas Automaticas */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E3DC]">
            <h2 className="text-lg font-bold text-stone-900">Reglas Automaticas</h2>
            <p className="text-xs text-stone-400 mt-0.5">Configura reglas para disparar premios automaticamente.</p>
          </div>
          <div className="px-6 py-5">
            <Link
              href="/admin/reglas"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-[#F97316] border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Ir a Reglas
            </Link>
          </div>
        </div>

        {/* Section 3: Programar mensaje (coming soon) */}
        <div className="bg-stone-50 rounded-2xl border border-[#E8E3DC] border-dashed overflow-hidden opacity-60">
          <div className="px-6 py-4 border-b border-[#E8E3DC]">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-500">Programar Mensaje</h2>
              <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-500">
                Proximamente
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">Programa envios masivos de mensajes en fechas especificas.</p>
          </div>
          <div className="px-6 py-8 flex flex-col items-center justify-center gap-3 text-stone-400">
            <svg className="w-10 h-10 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">Esta funcion estara disponible pronto.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
