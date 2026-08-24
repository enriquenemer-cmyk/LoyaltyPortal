'use client';

import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, useCallback } from 'react';

type AuditLog = {
  id: string;
  restaurant_id: string | null;
  action: string;
  description: string;
  user_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const PAGE_SIZE = 50;

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getActionBadge(action: string): { bg: string; text: string } {
  if (action.endsWith('_cancelled') || action.endsWith('_deleted')) {
    return { bg: 'bg-red-50', text: 'text-red-700' };
  }
  if (action.endsWith('_created') || action.endsWith('_generated')) {
    return { bg: 'bg-green-50', text: 'text-green-700' };
  }
  return { bg: 'bg-stone-100', text: 'text-stone-600' };
}

function ActionBadge({ action }: { action: string }) {
  const c = getActionBadge(action);
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      {action}
    </span>
  );
}

function SkeletonLoading() {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 border-b border-[#E8E3DC] flex gap-4">
          <div className="skeleton-blue h-4 w-32" />
          <div className="skeleton-blue h-4 w-40" />
          <div className="skeleton-blue h-4 flex-1" />
          <div className="skeleton-blue h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (actionFilter) params.set('action', actionFilter);
      const res = await fetch(`/api/admin/audit-log?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                {loading ? 'Cargando…' : `${total} ${total === 1 ? 'Registro' : 'Registros'}`}
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
                <MagnifyingGlassIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Auditoría
              </h1>
              <p className="text-orange-200/70 mt-1.5 text-sm">Registro completo de acciones del sistema</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">
        {/* Filter bar */}
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            placeholder="Filtrar por acción (ej. prize_created)..."
            className="w-full max-w-sm px-4 py-2 text-sm rounded-xl border border-[#E8E3DC] focus:outline-none focus:ring-2 focus:ring-orange-400/30"
          />
        </div>

        {loading ? (
          <SkeletonLoading />
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)]">
            {logs.length === 0 ? (
              <div className="p-10 text-center text-sm text-stone-400">No hay registros de auditoría.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E8E3DC] bg-stone-50/60">
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-400">Fecha</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-400">Acción</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-400">Descripción</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-widest text-stone-400">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-[#E8E3DC] last:border-0 hover:bg-stone-50/40 transition-colors">
                        <td className="px-5 py-3 text-xs text-stone-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                        <td className="px-5 py-3"><ActionBadge action={log.action} /></td>
                        <td className="px-5 py-3 text-[#1C1917]">{log.description}</td>
                        <td className="px-5 py-3 text-stone-500">{log.user_name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination footer */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
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
