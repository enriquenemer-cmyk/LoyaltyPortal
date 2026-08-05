'use client';
import { ChartBarIcon } from '@heroicons/react/24/outline';

import { useEffect, useMemo, useState } from 'react';
import { SkeletonCard, SkeletonTable } from '@/app/components/Skeleton';
import { EmptyState } from '@/app/components/EmptyState';
import RfmChart from '@/app/components/RfmChart';

type RfmSegment =
  | 'champions'
  | 'leales'
  | 'nuevos_prometedores'
  | 'en_riesgo'
  | 'perdidos'
  | 'regulares';

interface RfmCustomer {
  phone: string;
  full_name: string;
  last_visit: string;
  frequency: number;
  days_since: number;
  r_score: number;
  f_score: number;
  segment: RfmSegment;
}

const SEGMENT_LABELS: Record<RfmSegment, string> = {
  champions: 'Campeones',
  leales: 'Leales',
  nuevos_prometedores: 'Nuevos prometedores',
  en_riesgo: 'En riesgo',
  perdidos: 'Perdidos',
  regulares: 'Regulares',
};

const SEGMENT_BADGE_CLASS: Record<RfmSegment, string> = {
  champions: 'bg-amber-50 text-amber-700 border-amber-300',
  leales: 'bg-orange-50 text-orange-700 border-blue-300',
  nuevos_prometedores: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  en_riesgo: 'bg-orange-50 text-orange-700 border-orange-300',
  perdidos: 'bg-red-50 text-red-700 border-red-300',
  regulares: 'bg-slate-50 text-slate-700 border-slate-300',
};

function SegmentBadge({ segment }: { segment: RfmSegment }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wide ${SEGMENT_BADGE_CLASS[segment]}`}>
      {SEGMENT_LABELS[segment]}
    </span>
  );
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SegmentacionPage() {
  const [customers, setCustomers] = useState<RfmCustomer[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeSegment, setActiveSegment] = useState<RfmSegment | null>(null);

  useEffect(() => {
    async function fetchRfm() {
      try {
        const res = await fetch('/api/admin/rfm');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCustomers(data.customers ?? []);
        setSummary(data.summary ?? {});
      } catch {
        setError('No se pudo cargar la segmentación de clientes.');
      } finally {
        setLoading(false);
      }
    }
    fetchRfm();
  }, []);

  const filtered = useMemo(() => {
    let list = customers;
    if (activeSegment) list = list.filter((c) => c.segment === activeSegment);
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (c) => c.full_name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, activeSegment, search]);

  function toggleSegment(seg: RfmSegment) {
    setActiveSegment((prev) => (prev === seg ? null : seg));
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <ChartBarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Segmentación RFM
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Segmentación RFM</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Clasificación automática de clientes por valor y comportamiento</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">
        {/* Summary chart */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <div className="mb-8">
            <RfmChart summary={summary} activeSegment={activeSegment} onSegmentClick={toggleSegment} />
          </div>
        )}

        {/* Search */}
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all shadow-sm"
            />
          </div>
          {(search || activeSegment) && (
            <button
              onClick={() => { setSearch(''); setActiveSegment(null); }}
              className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 bg-white transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

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
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
            <EmptyState
              icon="search"
              title="Sin resultados para este filtro"
              description="Prueba con otro segmento o término de búsqueda."
              action={activeSegment ? { label: 'Ver todos los clientes', onClick: () => setActiveSegment(null) } : undefined}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Segmento</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Última visita</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Frecuencia</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">RFM</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((c) => {
                    const waLink = `https://wa.me/52${c.phone.replace(/\D/g, '')}?text=Hola%20${encodeURIComponent(c.full_name)}%2C%20te%20extra%C3%B1amos%20en%20Burrito%20Bar...`;
                    return (
                      <tr key={c.phone} className="hover:bg-orange-50/40 transition-colors group">
                        <td className="px-5 py-4">
                          <div>
                            <span className="font-medium text-slate-900 group-hover:text-[#2563EB] transition-colors text-sm">
                              {c.full_name}
                            </span>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.phone}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <SegmentBadge segment={c.segment} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-600 text-xs">{formatDate(c.last_visit)}</span>
                            <span className="text-[10px] text-slate-400">hace {c.days_since}d</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-[#2563EB] text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
                            {c.frequency} {c.frequency === 1 ? 'canje' : 'canjes'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-[10px] font-mono text-slate-400">R{c.r_score} F{c.f_score}</span>
                        </td>
                        <td className="px-5 py-4">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-80"
                            style={{ background: '#25D366' }}
                            title="Enviar WhatsApp"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WA
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 bg-[#FAFAF9] border-t border-[#E8E3DC] flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Mostrando <span className="font-medium text-slate-600">{filtered.length}</span> de{' '}
                <span className="font-medium text-slate-600">{customers.length}</span> clientes
                {activeSegment && (
                  <span className="ml-2 text-[#2563EB] font-bold">· {SEGMENT_LABELS[activeSegment]}</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
