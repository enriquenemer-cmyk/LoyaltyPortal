'use client';

import { useState, useEffect, useCallback } from 'react';

type FraudAlert = {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  phone: string | null;
  restaurant_id: string | null;
  restaurant_name: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  created_at: string;
};

const TYPE_ICON: Record<string, string> = {
  velocity_abuse: '⚡',
  shared_ip: '🌐',
  anomalous_spike: '📈',
  bot_claim_speed: '🤖',
};

const SEVERITY_STYLES: Record<string, { border: string; bg: string; badge: string; label: string }> = {
  high: { border: '#ef4444', bg: 'rgba(239,68,68,0.06)', badge: 'bg-red-500/20 text-red-300', label: 'Alta' },
  medium: { border: '#f59e0b', bg: 'rgba(245,158,11,0.06)', badge: 'bg-amber-500/20 text-amber-300', label: 'Media' },
  low: { border: '#94a3b8', bg: 'rgba(148,163,184,0.06)', badge: 'bg-slate-500/20 text-slate-300', label: 'Baja' },
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} minuto${mins === 1 ? '' : 's'}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days === 1 ? '' : 's'}`;
}

export default function FraudePage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unresolved' | 'all'>('unresolved');
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchAlerts = useCallback(async (f: 'unresolved' | 'all') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fraud-alerts?resolved=${f === 'all' ? 'true' : 'false'}`);
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(filter); }, [filter, fetchAlerts]);

  async function resolveAlert(id: string) {
    setResolving(id);
    try {
      await fetch(`/api/admin/fraud-alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    } finally {
      setResolving(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            🚨 Seguridad
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Detector de Fraude</h1>
          <p className="text-blue-200/70 mt-1.5 text-sm">
            Alertas automáticas de actividad sospechosa
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === 'unresolved' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/8'
            }`}
          >
            Sin resolver
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === 'all' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/8'
            }`}
          >
            Todas
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Cargando alertas...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 py-16 px-6 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="text-white font-bold text-base">Todo en orden, sin actividad sospechosa detectada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const sev = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low;
              const icon = TYPE_ICON[alert.type] ?? '⚠️';
              return (
                <div
                  key={alert.id}
                  className="rounded-2xl p-4 border-l-4 bg-[#1A1A1A]"
                  style={{ borderLeftColor: sev.border, background: `${sev.bg}, #1A1A1A` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${sev.badge}`}>
                          {sev.label}
                        </span>
                        {alert.phone && (
                          <span className="text-xs text-slate-400">📞 {alert.phone}</span>
                        )}
                        {alert.restaurant_name && (
                          <span className="text-xs text-slate-400">🏠 {alert.restaurant_name}</span>
                        )}
                        <span className="text-xs text-slate-500 ml-auto">{timeAgo(alert.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-200">{alert.description}</p>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        disabled={resolving === alert.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                      >
                        {resolving === alert.id ? 'Resolviendo...' : 'Marcar como resuelta'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
