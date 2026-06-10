'use client';

import { useEffect, useState } from 'react';

type LogEntry = {
  id: string;
  action: string;
  description: string;
  user_name: string | null;
  created_at: string;
  restaurant_id: string | null;
  metadata?: Record<string, unknown> | null;
};

export default function SeguridadPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/api/activity-log')
      .then(r => r.json())
      .then(d => setLogs(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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

  const actionColor: Record<string, string> = {
    admin_login: 'bg-blue-50 text-blue-700',
    prize_created: 'bg-blue-50 text-blue-700',
    claim_registered: 'bg-emerald-50 text-emerald-700',
    claim_delivered: 'bg-green-50 text-green-700',
    password_reset_requested: 'bg-blue-50 text-blue-700',
    password_reset_completed: 'bg-purple-50 text-purple-700',
  };

  const actionLabel: Record<string, string> = {
    admin_login: 'Login',
    prize_created: 'Premio creado',
    claim_registered: 'Registro',
    claim_delivered: 'Entregado',
    password_reset_requested: 'Reset solicitado',
    password_reset_completed: 'Reset completado',
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-1">Admin</p>
            <h1 className="text-2xl font-bold text-[#1C1917]">Seguridad</h1>
            <p className="text-sm text-[#78716c] mt-1">Registro de actividad y exportación de datos</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 transition-opacity hover:opacity-90"
            style={{ background: '#2563EB' }}
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
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-[#a8a29e] text-sm">
              Sin actividad registrada
            </div>
          ) : (
            <div className="divide-y divide-[#F3EFE9]">
              {logs.map(log => (
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
