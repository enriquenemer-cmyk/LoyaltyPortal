'use client';
import { UserPlusIcon } from '@heroicons/react/24/outline';

import { useEffect, useMemo, useState } from 'react';
import { EmptyState } from '@/app/components/EmptyState';
import { SkeletonTable } from '@/app/components/Skeleton';

type Lead = {
  phone: string;
  full_name: string | null;
  email: string | null;
  first_seen: string;
  last_seen: string;
  total_interactions: number;
  prizes_count: number;
  games_count: number;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function exportCSV(leads: Lead[]) {
  const headers = ['Nombre', 'Telefono', 'Email', 'Primer contacto', 'Ultimo contacto', 'Premios', 'Juegos', 'Total'];
  const rows = leads.map((l) => [
    l.full_name ?? '', l.phone, l.email ?? '',
    formatDate(l.first_seen), formatDate(l.last_seen),
    String(l.prizes_count), String(l.games_count), String(l.total_interactions),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-3E-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/admin/leads')
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => (l.full_name ?? '').toLowerCase().includes(q) || l.phone.includes(q) || (l.email ?? '').toLowerCase().includes(q));
  }, [leads, search]);

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-6xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <UserPlusIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Contactos capturados
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Leads</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm max-w-xl">
              Todas las personas que han dejado sus datos al reclamar un premio o jugar un juego, en un solo lugar.
            </p>
          </div>
          <button
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all disabled:opacity-50"
            style={{ background: 'white', color: '#F97316', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-10 py-6">
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="w-full max-w-sm px-4 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
          />
        </div>

        {loading ? (
          <SkeletonTable rows={8} />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
            <EmptyState
              icon="search"
              title={leads.length === 0 ? 'Sin leads todavía' : 'Sin resultados'}
              description={leads.length === 0 ? 'Aquí aparecerán las personas que reclamen premios o jueguen en la plataforma.' : 'Prueba con otro término de búsqueda.'}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Teléfono</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Email</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Primer contacto</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Último contacto</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Premios</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Juegos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE4]">
                  {filtered.map((l) => (
                    <tr key={l.phone} className="hover:bg-[#faf7f5] transition-colors">
                      <td className="px-5 py-4 font-medium text-[#1C1917]">{l.full_name || '—'}</td>
                      <td className="px-5 py-4 text-stone-500 font-mono text-xs">{l.phone}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{l.email || '—'}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs whitespace-nowrap">{formatDate(l.first_seen)}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs whitespace-nowrap">{formatDate(l.last_seen)}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{l.prizes_count}</td>
                      <td className="px-5 py-4 text-stone-500 text-xs">{l.games_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[#F0EBE4] text-xs text-stone-400">
              {filtered.length} {filtered.length === 1 ? 'lead' : 'leads'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
