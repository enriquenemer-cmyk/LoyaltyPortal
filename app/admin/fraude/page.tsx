'use client';
import { CheckCircleIcon, ExclamationCircleIcon, HomeIcon, PhoneIcon } from '@heroicons/react/24/outline';

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
  velocity_abuse: '',
  shared_ip: '',
  anomalous_spike: '',
  bot_claim_speed: '',
};

const SEVERITY_STYLES: Record<string, { border: string; bg: string; badge: string; label: string }> = {
  high: { border: '#ef4444', bg: '#fef2f2', badge: 'bg-red-50 text-red-700 border border-red-200', label: 'Alta' },
  medium: { border: '#f59e0b', bg: '#fffbeb', badge: 'bg-amber-50 text-amber-700 border border-amber-200', label: 'Media' },
  low: { border: '#94a3b8', bg: '#f8fafc', badge: 'bg-slate-100 text-slate-600 border border-slate-200', label: 'Baja' },
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
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <ExclamationCircleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Seguridad
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Detector de Fraude</h1>
          <p className="text-orange-200/70 mt-1.5 text-sm">
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
              filter === 'unresolved' ? 'bg-orange-50 text-[#F97316] border border-orange-200' : 'bg-white text-slate-500 border border-[#E8E3DC] hover:bg-slate-50'
            }`}
          >
            Sin resolver
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === 'all' ? 'bg-orange-50 text-[#F97316] border border-orange-200' : 'bg-white text-slate-500 border border-[#E8E3DC] hover:bg-slate-50'
            }`}
          >
            Todas
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Cargando alertas...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm py-16 px-6 text-center">
            <p className="text-emerald-500 mb-2 flex justify-center"><CheckCircleIcon className="w-10 h-10" aria-hidden="true" /></p>
            <p className="text-[#1C1917] font-bold text-base">Todo en orden, sin actividad sospechosa detectada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const sev = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.low;
              const icon = TYPE_ICON[alert.type] ?? '';
              return (
                <div
                  key={alert.id}
                  className="rounded-2xl p-4 border-l-4 bg-white border border-[#E8E3DC] shadow-sm"
                  style={{ borderLeftColor: sev.border, background: sev.bg }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xl shrink-0">{icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${sev.badge}`}>
                          {sev.label}
                        </span>
                        {alert.phone && (
                          <span className="text-xs text-slate-500"><PhoneIcon className="w-4 h-4 inline-block align-middle" aria-hidden="true" /> {alert.phone}</span>
                        )}
                        {alert.restaurant_name && (
                          <span className="text-xs text-slate-500"><HomeIcon className="w-4 h-4 inline-block align-middle" aria-hidden="true" /> {alert.restaurant_name}</span>
                        )}
                        <span className="text-xs text-slate-400 ml-auto">{timeAgo(alert.created_at)}</span>
                      </div>
                      <p className="text-sm text-[#1C1917]">{alert.description}</p>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => resolveAlert(alert.id)}
                        disabled={resolving === alert.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all disabled:opacity-50"
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
