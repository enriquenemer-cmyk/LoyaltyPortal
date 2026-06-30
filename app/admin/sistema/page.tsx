'use client';

import { useCallback, useEffect, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
type HealthData = {
  db_latency_ms: number;
  total_records: {
    prizes: number;
    claims: number;
    restaurants: number;
    users: number;
    game_plays: number;
    ticket_claims: number;
    notifications: number;
    messages: number;
  };
  recent_errors: Array<{
    id: string;
    action: string;
    description: string;
    user_name: string | null;
    created_at: string;
  }>;
  uptime_check: boolean;
  table_health: {
    claims_today: number;
    prizes_active: number;
    notifications_unread: number;
  };
};

type ActivityEntry = {
  id: string;
  action: string;
  description: string;
  user_name: string | null;
  created_at: string;
  restaurant_id: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function latencyColor(ms: number): string {
  if (ms < 0) return 'text-red-600';
  if (ms < 100) return 'text-emerald-600';
  if (ms < 500) return 'text-blue-500';
  return 'text-red-600';
}

function latencyBg(ms: number): string {
  if (ms < 0) return 'bg-red-50 border-red-200';
  if (ms < 100) return 'bg-emerald-50 border-emerald-200';
  if (ms < 500) return 'bg-blue-50 border-blue-200';
  return 'bg-red-50 border-red-200';
}

// ── Cleanup button ────────────────────────────────────────────────────────────
function CleanupButton({ action, label }: { action: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function run() {
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/system/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('error');
        setMessage(data.error ?? 'Error desconocido');
      } else {
        setStatus('done');
        const note = data.note ? ` (${data.note})` : '';
        setMessage(`${data.deleted} registros eliminados${note}`);
      }
    } catch (e) {
      setStatus('error');
      setMessage(e instanceof Error ? e.message : 'Error de red');
    }
    setTimeout(() => setStatus('idle'), 5000);
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-stone-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-stone-700">{label}</p>
        {message && (
          <p className={`text-xs mt-0.5 ${status === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
            {message}
          </p>
        )}
      </div>
      <button
        onClick={run}
        disabled={status === 'loading'}
        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
          status === 'loading'
            ? 'bg-stone-50 text-stone-400 border-stone-200 cursor-not-allowed'
            : status === 'done'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : status === 'error'
            ? 'bg-red-50 text-red-700 border-red-200'
            : 'bg-white text-stone-600 border-stone-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
        }`}
      >
        {status === 'loading' ? 'Ejecutando...' : status === 'done' ? 'Listo' : status === 'error' ? 'Error' : 'Ejecutar'}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SistemaPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, activityRes] = await Promise.all([
        fetch('/api/system/health'),
        fetch('/api/activity-log?limit=20'),
      ]);
      if (healthRes.ok) {
        setHealth(await healthRes.json());
        setLastChecked(new Date());
      }
      if (activityRes.ok) {
        const d = await activityRes.json();
        setActivity(d.entries ?? d.logs ?? []);
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60_000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const isHealthy = health?.uptime_check && (health.db_latency_ms >= 0 && health.db_latency_ms < 500);

  const tableRows: Array<{ key: keyof HealthData['total_records']; label: string }> = [
    { key: 'prizes', label: 'Premios' },
    { key: 'claims', label: 'Cobros' },
    { key: 'restaurants', label: 'Restaurantes' },
    { key: 'users', label: 'Usuarios' },
    { key: 'game_plays', label: 'Jugadas' },
    { key: 'ticket_claims', label: 'Tickets' },
    { key: 'notifications', label: 'Notificaciones' },
    { key: 'messages', label: 'Mensajes' },
  ];

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              🛠️ Sistema
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Sistema</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">
              {lastChecked
                ? `Ultima verificacion: ${lastChecked.toLocaleTimeString('es-MX')}`
                : 'Estado del sistema y diagnóstico'}
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm"
            style={{ background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Ejecutar diagnostico
          </button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-10 py-6 space-y-6">

      {/* Status banner */}
      {health && (
        <div
          className={`flex items-center gap-3 px-5 py-4 rounded-2xl border font-semibold text-sm ${
            isHealthy
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <span className="text-xl">{isHealthy ? '✅' : '⚠️'}</span>
          <span>
            {isHealthy
              ? 'Sistema funcionando correctamente'
              : 'Hay un problema — revisa los detalles abajo'}
          </span>
        </div>
      )}

      {/* Top cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* DB latency */}
        <div
          className={`rounded-2xl border p-5 ${health ? latencyBg(health.db_latency_ms) : 'bg-stone-50 border-stone-200'}`}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1">Latencia BD</p>
          {health ? (
            <>
              <p className={`text-3xl font-extrabold ${latencyColor(health.db_latency_ms)}`}>
                {health.db_latency_ms < 0 ? 'N/A' : `${health.db_latency_ms} ms`}
              </p>
              <p className="text-xs text-stone-500 mt-1">
                {health.db_latency_ms < 0
                  ? 'No se pudo conectar'
                  : health.db_latency_ms < 100
                  ? 'Excelente'
                  : health.db_latency_ms < 500
                  ? 'Aceptable'
                  : 'Lento — revisar'}
              </p>
            </>
          ) : (
            <div className="h-8 bg-stone-200 rounded animate-pulse mt-1" />
          )}
        </div>

        {/* Cobros hoy */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1">Cobros hoy</p>
          {health ? (
            <p className="text-3xl font-extrabold text-[#1C1917]">{health.table_health.claims_today}</p>
          ) : (
            <div className="h-8 bg-stone-200 rounded animate-pulse mt-1" />
          )}
          <p className="text-xs text-stone-400 mt-1">Registros de cobro del dia</p>
        </div>

        {/* Premios activos */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-1">Premios activos</p>
          {health ? (
            <p className="text-3xl font-extrabold text-[#1C1917]">{health.table_health.prizes_active}</p>
          ) : (
            <div className="h-8 bg-stone-200 rounded animate-pulse mt-1" />
          )}
          <p className="text-xs text-stone-400 mt-1">No cancelados, vigentes</p>
        </div>
      </div>

      {/* Records table */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-bold text-[#1C1917]">Registros por tabla</h2>
        </div>
        <div className="divide-y divide-stone-100">
          {tableRows.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm text-stone-600">{label}</span>
              {health ? (
                <span className="text-sm font-semibold text-[#1C1917] tabular-nums">
                  {health.total_records[key].toLocaleString('es-MX')}
                </span>
              ) : (
                <div className="w-12 h-4 bg-stone-200 rounded animate-pulse" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent errors */}
      {health && health.recent_errors.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 overflow-hidden">
          <div className="px-5 py-4 border-b border-red-200">
            <h2 className="text-sm font-bold text-red-800">Errores recientes</h2>
          </div>
          <div className="divide-y divide-red-100">
            {health.recent_errors.map((err) => (
              <div key={err.id} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-red-800 font-medium truncate">{err.description}</p>
                    {err.user_name && (
                      <p className="text-xs text-red-500 mt-0.5">Por: {err.user_name}</p>
                    )}
                  </div>
                  <p className="text-xs text-red-400 shrink-0 mt-0.5">{fmtDate(err.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity feed */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-bold text-[#1C1917]">Actividad reciente</h2>
          <p className="text-xs text-stone-400 mt-0.5">Ultimos 20 eventos del sistema</p>
        </div>
        {activity.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-stone-400">
            {loading ? 'Cargando actividad...' : 'Sin registros de actividad'}
          </div>
        ) : (
          <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
            {activity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={`mt-0.5 shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                    entry.action === 'error'
                      ? 'bg-red-100 text-red-600'
                      : entry.action === 'login' || entry.action === 'logout'
                      ? 'bg-blue-50 text-blue-600'
                      : entry.action === 'deliver'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {entry.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-700 truncate">{entry.description}</p>
                  {entry.user_name && (
                    <p className="text-[10px] text-stone-400 mt-0.5">{entry.user_name}</p>
                  )}
                </div>
                <p className="text-[10px] text-stone-400 shrink-0 mt-0.5 whitespace-nowrap">
                  {fmtDate(entry.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cleanup section */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-bold text-[#1C1917]">Limpiar datos antiguos</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Operaciones de mantenimiento sobre la base de datos. No se pueden deshacer.
          </p>
        </div>
        <div className="px-5">
          <CleanupButton
            action="old_notifications"
            label="Eliminar notificaciones de mas de 30 dias"
          />
          <CleanupButton
            action="expired_tokens"
            label="Eliminar tokens de reset expirados"
          />
          <CleanupButton
            action="compact_logs"
            label="Compactar log de actividad (mantener ultimos 1000)"
          />
        </div>
      </div>

      {/* Auto-refresh notice */}
      <p className="text-center text-xs text-stone-300">
        Se actualiza automaticamente cada 60 segundos
      </p>
    </div>
    </div>
  );
}
