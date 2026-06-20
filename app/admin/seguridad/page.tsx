'use client';

import { useEffect, useMemo, useState } from 'react';

type LogEntry = {
  id: string;
  action: string;
  description: string;
  user_name: string | null;
  created_at: string;
  restaurant_id: string | null;
  metadata?: Record<string, unknown> | null;
};

const actionColor: Record<string, string> = {
  admin_login: 'bg-blue-50 text-blue-700',
  prize_created: 'bg-blue-50 text-blue-700',
  claim_registered: 'bg-emerald-50 text-emerald-700',
  claim_delivered: 'bg-green-50 text-green-700',
  password_reset_requested: 'bg-blue-50 text-blue-700',
  password_reset_completed: 'bg-purple-50 text-purple-700',
  rate_limit_exceeded: 'bg-red-50 text-red-700',
};

const actionLabel: Record<string, string> = {
  admin_login: 'Login',
  prize_created: 'Premio creado',
  claim_registered: 'Registro',
  claim_delivered: 'Entregado',
  password_reset_requested: 'Reset solicitado',
  password_reset_completed: 'Reset completado',
  rate_limit_exceeded: 'Rate limit excedido',
};

export default function SeguridadPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [allActions, setAllActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Load all entries once to populate the action-type dropdown — never filtered
    fetch('/api/activity-log?limit=500')
      .then(r => r.json())
      .then(d => {
        const actions = [...new Set<string>((d.entries ?? []).map((e: LogEntry) => e.action))].sort();
        setAllActions(actions);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (actionFilter) params.set('action', actionFilter);
    fetch(`/api/activity-log?${params}`)
      .then(r => r.json())
      .then(d => setLogs(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [actionFilter]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      l.description.toLowerCase().includes(q) || (l.user_name ?? '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const rateLimitHits = useMemo(
    () => logs.filter((l) => l.action === 'rate_limit_exceeded').length,
    [logs]
  );

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/export');
      if (!res.ok) { alert('Error al exportar'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }

  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyResetLink(log: LogEntry) {
    const token = log.metadata?.token;
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/admin/reset-password?token=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              🔒 Seguridad
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Seguridad</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Registro de actividad y exportación de datos</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm disabled:opacity-60"
            style={{ background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            {exporting ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            {exporting ? 'Exportando...' : 'Exportar datos (JSON)'}
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-[#E8E3DC] bg-white p-4">
            <p className="text-2xl font-extrabold text-[#1C1917] tabular-nums">{logs.length}</p>
            <p className="text-xs text-stone-500 mt-1">Eventos mostrados</p>
          </div>
          <div className={`rounded-2xl border p-4 ${rateLimitHits > 0 ? 'border-red-200 bg-red-50' : 'border-[#E8E3DC] bg-white'}`}>
            <p className={`text-2xl font-extrabold tabular-nums ${rateLimitHits > 0 ? 'text-red-700' : 'text-[#1C1917]'}`}>{rateLimitHits}</p>
            <p className="text-xs text-stone-500 mt-1">Rate limits excedidos</p>
          </div>
          <div className="rounded-2xl border border-[#E8E3DC] bg-white p-4">
            <p className="text-2xl font-extrabold text-[#1C1917] tabular-nums">{allActions.length}</p>
            <p className="text-xs text-stone-500 mt-1">Tipos de evento</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white text-[#1C1917] focus:outline-none focus:border-[#2563EB]"
          >
            <option value="">Todos los eventos</option>
            {allActions.map((a) => (
              <option key={a} value={a}>{actionLabel[a] ?? a}</option>
            ))}
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción o usuario..."
            className="flex-1 min-w-[200px] border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white text-[#1C1917] focus:outline-none focus:border-[#2563EB]"
          />
        </div>

        <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(28,25,23,0.06)' }}>
          <div className="px-6 py-4 border-b border-[#E8E3DC]">
            <h2 className="text-sm font-bold text-[#1C1917]">Registro de actividad reciente</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin w-7 h-7 text-[#2563EB]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-[#a8a29e] text-sm">
              Sin actividad registrada
            </div>
          ) : (
            <div className="divide-y divide-[#F3EFE9]">
              {filteredLogs.map(log => (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 flex-wrap">
                  <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full mt-0.5 ${actionColor[log.action] ?? 'bg-stone-50 text-stone-600'}`}>
                    {actionLabel[log.action] ?? log.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1C1917] font-medium truncate">{log.description}</p>
                    {log.user_name && (
                      <p className="text-xs text-[#a8a29e] mt-0.5">{log.user_name}</p>
                    )}
                    {log.action === 'password_reset_requested' && !!log.metadata?.token && (
                      <button
                        onClick={() => copyResetLink(log)}
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                        style={copiedId === log.id
                          ? { background: '#f0fdf4', borderColor: '#86efac', color: '#16a34a' }
                          : { background: '#EFF6FF', borderColor: '#BAE6FD', color: '#c2410c' }
                        }
                      >
                        {copiedId === log.id ? (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Link copiado
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copiar link de reset
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <time className="text-xs text-[#a8a29e] shrink-0 mt-0.5">
                    {new Date(log.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
