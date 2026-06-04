'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Prize = {
  id: string;
  name: string;
  reason: string;
  description: string;
  start_date: string;
  end_date: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  cancelled: boolean;
  claim_count: number;
  created_at: string;
};

function getPrizeStatus(p: Prize): { label: string; color: string; dot: string } {
  if (p.cancelled) return { label: 'Cancelado', color: 'bg-red-50 text-red-700 border-red-200', dot: '⛔' };
  if (p.claim_count > 0) return { label: 'Canjeado', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: '✅' };
  const today = new Date().toISOString().split('T')[0];
  if (today > p.end_date) return { label: 'Expirado', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: '🔴' };
  return { label: 'Activo', color: 'bg-green-50 text-green-700 border-green-200', dot: '🟢' };
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PremiosPage() {
  const router = useRouter();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);

  async function fetchPrizes() {
    const res = await fetch('/api/prizes/list');
    const data = await res.json();
    if (data.prizes) setPrizes(data.prizes);
    setLoading(false);
  }

  useEffect(() => { fetchPrizes(); }, []);

  async function handleCancel(id: string) {
    if (!confirm('¿Cancelar este premio? Esta acción no se puede deshacer.')) return;
    setCancelling(id);
    await fetch(`/api/prizes/${id}/cancel`, { method: 'POST' });
    await fetchPrizes();
    setCancelling(null);
  }

  function handleDuplicate(p: Prize) {
    const params = new URLSearchParams({
      name: p.name,
      reason: p.reason,
      description: p.description,
      ...(p.restaurant_id ? { restaurant_id: p.restaurant_id } : {}),
    });
    router.push(`/admin/generate?${params.toString()}`);
  }

  const filtered = prizes.filter((p) => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.restaurant_name || '').toLowerCase().includes(q);
  });

  const total = prizes.length;
  const activos = prizes.filter((p) => !p.cancelled && p.claim_count === 0 && new Date().toISOString().split('T')[0] <= p.end_date).length;
  const canjeados = prizes.filter((p) => p.claim_count > 0).length;
  const expirados = prizes.filter((p) => !p.cancelled && p.claim_count === 0 && new Date().toISOString().split('T')[0] > p.end_date).length;
  const cancelados = prizes.filter((p) => p.cancelled).length;

  return (
    <div className="min-h-screen bg-[#fdf8f5]">
      <div className="max-w-7xl mx-auto px-4 py-10">

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 border border-orange-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4h.01M8 8h.01M16 8h.01M4 12h.01M20 12h.01M8 16h.01M16 16h.01M12 20h.01M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z" />
            </svg>
            Premios
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Todos los <span className="gradient-text">Premios</span></h1>
          <p className="text-slate-500 mt-2 text-sm">Historial completo de premios generados.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Total', value: total, color: 'text-slate-800' },
            { label: 'Activos', value: activos, color: 'text-green-700' },
            { label: 'Canjeados', value: canjeados, color: 'text-orange-700' },
            { label: 'Expirados', value: expirados, color: 'text-slate-500' },
            { label: 'Cancelados', value: cancelados, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="mb-5 flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o restaurante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-20 text-center">
            <svg className="animate-spin w-8 h-8 text-orange-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-slate-400 text-sm">Cargando premios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
            <p className="text-slate-500 font-semibold">No hay premios{search ? ' que coincidan' : ' aún'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Restaurante</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Razón</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Inicio</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Fin</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((p) => {
                    const status = getPrizeStatus(p);
                    const canCancel = !p.cancelled && p.claim_count === 0;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 font-semibold text-slate-900 max-w-[180px] truncate">{p.name}</td>
                        <td className="px-5 py-4 text-slate-500 text-xs">{p.restaurant_name || '—'}</td>
                        <td className="px-5 py-4 text-slate-500 text-xs max-w-[160px] truncate">{p.reason}</td>
                        <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">{formatDate(p.start_date)}</td>
                        <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">{formatDate(p.end_date)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${status.color}`}>
                            {status.dot} {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDuplicate(p)}
                              className="text-xs font-semibold text-orange-700 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Duplicar
                            </button>
                            {canCancel && (
                              <button
                                onClick={() => handleCancel(p.id)}
                                disabled={cancelling === p.id}
                                className="text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {cancelling === p.id ? '...' : 'Cancelar'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
