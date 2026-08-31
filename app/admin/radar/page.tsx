'use client';
import {
  UsersIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  StarIcon,
  BoltIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

type Activity = {
  action: string;
  description: string;
  user_name: string;
  created_at: string;
};

type HourlyEntry = { hour: number; count: string };

type RadarData = {
  today_claims: number;
  last_hour_claims: number;
  pending_deliveries: number;
  active_employees: number;
  active_employee_names: string | null;
  vip_visits_today: number;
  recent_activity: Activity[];
  hourly_claims: HourlyEntry[];
  timestamp: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function actionIcon(action: string) {
  if (action.includes('claim') || action.includes('cobro')) return '🎁';
  if (action.includes('mission')) return '🏆';
  if (action.includes('clock') || action.includes('fich')) return '🕐';
  if (action.includes('birthday')) return '🎂';
  if (action.includes('fraud')) return '⚠️';
  if (action.includes('prize')) return '🎀';
  return '📋';
}

function MiniBar({ hourly }: { hourly: HourlyEntry[] }) {
  const max = Math.max(...hourly.map(h => parseInt(h.count)), 1);
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = hourly.find(h => h.hour === i);
    return { hour: i, count: found ? parseInt(found.count) : 0 };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
      {hours.map(h => (
        <div
          key={h.hour}
          title={`${h.hour}:00 — ${h.count} canjes`}
          style={{
            flex: 1,
            height: `${Math.max((h.count / max) * 100, h.count > 0 ? 8 : 2)}%`,
            background: h.count > 0 ? '#F97316' : '#e5e7eb',
            borderRadius: 2,
            transition: 'height 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

export default function RadarPage() {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pulse, setPulse] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchData(showPulse = false) {
    try {
      const res = await fetch('/api/admin/radar');
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      if (showPulse) {
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(true), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const kpis = data ? [
    {
      label: 'Canjes hoy',
      value: data.today_claims,
      sub: `${data.last_hour_claims} en la última hora`,
      icon: <BoltIcon className="w-5 h-5" />,
      color: '#F97316',
      bg: '#FFF7ED',
    },
    {
      label: 'Entregas pendientes',
      value: data.pending_deliveries,
      sub: data.pending_deliveries > 0 ? 'Por entregar' : 'Todo entregado ✓',
      icon: <ExclamationTriangleIcon className="w-5 h-5" />,
      color: data.pending_deliveries > 5 ? '#dc2626' : '#1a6b3c',
      bg: data.pending_deliveries > 5 ? '#fef2f2' : '#f0fdf4',
    },
    {
      label: 'Empleados activos',
      value: data.active_employees,
      sub: data.active_employee_names ?? 'Ninguno fichado',
      icon: <UsersIcon className="w-5 h-5" />,
      color: '#6366f1',
      bg: '#eef2ff',
    },
    {
      label: 'Visitas VIP hoy',
      value: data.vip_visits_today,
      sub: 'Clientes nivel Oro',
      icon: <StarIcon className="w-5 h-5" />,
      color: '#d97706',
      bg: '#fffbeb',
    },
  ] : [];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span /><span /><span /></div>
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <span className={`w-2 h-2 rounded-full bg-green-400 ${pulse ? 'animate-ping' : 'animate-pulse'}`} />
              En vivo
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Radar</h1>
            <p className="text-white/70 text-sm mt-1">Centro de control en tiempo real · actualiza cada 30s</p>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:bg-white/10"
            style={{ border: '1.5px solid rgba(255,255,255,0.3)' }}
          >
            <ArrowPathIcon className={`w-4 h-4 ${pulse ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-[#E8E3DC] animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-2xl bg-white border border-[#E8E3DC] shadow-sm p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: k.bg, color: k.color }}>
                      {k.icon}
                    </div>
                  </div>
                  <div className="text-3xl font-black" style={{ color: k.color }}>{k.value}</div>
                  <div>
                    <div className="text-xs font-bold text-[#1C1917]">{k.label}</div>
                    <div className="text-[11px] text-stone-400 mt-0.5 truncate">{k.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hourly chart */}
            {data && (
              <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">Canjes por hora — hoy</div>
                  {lastUpdated && (
                    <div className="text-[10px] text-stone-300 flex items-center gap-1">
                      <ClockIcon className="w-3 h-3" />
                      {lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
                <MiniBar hourly={data.hourly_claims} />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-stone-300">0h</span>
                  <span className="text-[9px] text-stone-300">12h</span>
                  <span className="text-[9px] text-stone-300">23h</span>
                </div>
              </div>
            )}

            {/* Activity feed */}
            {data && data.recent_activity.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#E8E3DC]">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Actividad reciente</span>
                </div>
                <div className="divide-y divide-[#F5F3F0] max-h-[480px] overflow-y-auto">
                  {data.recent_activity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3">
                      <span className="text-lg shrink-0 mt-0.5">{actionIcon(a.action)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#1C1917] truncate">{a.description}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{a.user_name}</p>
                      </div>
                      <span className="text-[10px] text-stone-300 shrink-0">{timeAgo(a.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
