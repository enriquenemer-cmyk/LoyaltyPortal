'use client';

import { useEffect, useRef, useState } from 'react';

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
};

type RestaurantScore = {
  id: string;
  name: string;
  claims_count: number;
  sales_total: number;
  new_customers: number;
  score: number;
  rank: number;
};

type LeaderboardData = {
  period: Period;
  restaurants: RestaurantScore[];
  updated_at: string;
};

function formatMoney(n: number): string {
  return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const RANK_STYLES: Record<number, { card: string; border: string; emoji: string }> = {
  1: {
    card: 'bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50',
    border: 'border-amber-300',
    emoji: '🏆',
  },
  2: {
    card: 'bg-gradient-to-r from-slate-50 to-slate-100',
    border: 'border-slate-300',
    emoji: '🥈',
  },
  3: {
    card: 'bg-gradient-to-r from-orange-50 to-orange-100',
    border: 'border-orange-300',
    emoji: '🥉',
  },
};

export default function CompetenciaPage() {
  const [period, setPeriod] = useState<Period>('today');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [myRestaurantId, setMyRestaurantId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);

  const prevScoresRef = useRef<Map<string, number>>(new Map());
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const [changedRows, setChangedRows] = useState<Set<string>>(new Set());
  const [rankDeltas, setRankDeltas] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setMyRole(d.user.role ?? null);
          setMyRestaurantId(d.user.restaurantId ?? null);
        }
      })
      .catch(() => {});
  }, []);

  async function load(p: Period, isPoll: boolean) {
    if (!isPoll) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leaderboard?period=${p}`);
      if (!res.ok) throw new Error('Error al cargar el ranking');
      const json: LeaderboardData = await res.json();

      // Compute score changes + rank deltas vs previous fetch
      const newChanged = new Set<string>();
      const newDeltas = new Map<string, number>();
      for (const r of json.restaurants) {
        const prevScore = prevScoresRef.current.get(r.id);
        if (prevScore !== undefined && prevScore !== r.score) {
          newChanged.add(r.id);
        }
        const prevRank = prevRanksRef.current.get(r.id);
        if (prevRank !== undefined && prevRank !== r.rank) {
          newDeltas.set(r.id, prevRank - r.rank); // positive = moved up
        }
      }

      prevScoresRef.current = new Map(json.restaurants.map((r) => [r.id, r.score]));
      prevRanksRef.current = new Map(json.restaurants.map((r) => [r.id, r.rank]));

      setData(json);
      setChangedRows(newChanged);
      setRankDeltas(newDeltas);

      if (isPoll) {
        setPulse(true);
        setTimeout(() => setPulse(false), 1200);
      }
      if (newChanged.size > 0 || newDeltas.size > 0) {
        setTimeout(() => {
          setChangedRows(new Set());
          setRankDeltas(new Map());
        }, 2500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  // Initial + period-change load
  useEffect(() => {
    prevScoresRef.current = new Map();
    prevRanksRef.current = new Map();
    load(period, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Auto-refresh polling every 15s
  useEffect(() => {
    const interval = setInterval(() => {
      load(period, true);
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  const restaurants = data?.restaurants ?? [];
  const isManager = myRole === 'manager';

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              🏁 Competencia
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Competencia entre Sucursales</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Ranking en vivo de tus restaurantes</p>
          </div>
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${pulse ? 'scale-110' : 'scale-100'}`}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#bbf7d0', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <span className={`w-2 h-2 rounded-full bg-emerald-400 inline-block ${pulse ? 'animate-pulse' : ''}`} />
            🟢 En vivo
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Period tabs */}
        <div className="flex gap-1 bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl p-1 mb-6 w-fit">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                period === p
                  ? 'bg-white text-[#2563EB] shadow-sm border border-[#E8E3DC]'
                  : 'text-stone-500 hover:text-gray-900'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <svg className="animate-spin w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : restaurants.length <= 1 ? (
          <div className="rounded-2xl border border-[#E8E3DC] bg-white p-10 text-center">
            <div className="text-4xl mb-3">🏁</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Agrega más restaurantes para activar la competencia entre sucursales</h3>
            <p className="text-stone-400 text-sm">Necesitas al menos 2 sucursales registradas para ver un ranking.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {restaurants.map((r) => {
              const isMine = isManager && myRestaurantId === r.id;
              const isChanged = changedRows.has(r.id);
              const delta = rankDeltas.get(r.id);
              const top = RANK_STYLES[r.rank];

              if (top) {
                return (
                  <div
                    key={r.id}
                    className={`rounded-2xl border-2 ${top.border} ${top.card} p-6 transition-all ${isChanged ? 'ring-2 ring-blue-400' : ''} ${isMine ? 'outline outline-2 outline-offset-2 outline-blue-500' : ''}`}
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{top.emoji}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-[#1C1917]">{r.name}</h3>
                            {isMine && (
                              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                                Tu sucursal
                              </span>
                            )}
                            {delta !== undefined && delta !== 0 && (
                              <span className={`text-xs font-bold ${delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-500 mt-1">
                            {r.claims_count} cobros · {formatMoney(r.sales_total)} en ventas · {r.new_customers} clientes nuevos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-black tabular-nums" style={{ color: '#92400e' }}>{r.score.toLocaleString('es-MX')}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">puntos</div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={r.id}
                  className={`rounded-xl border border-[#E8E3DC] bg-white p-4 flex items-center justify-between flex-wrap gap-3 transition-all ${isChanged ? 'ring-2 ring-blue-400' : ''} ${isMine ? 'outline outline-2 outline-offset-2 outline-blue-500 bg-blue-50/30' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-stone-400 w-6 text-center">{r.rank}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-[#1C1917] text-sm">{r.name}</h4>
                        {isMine && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                            Tu sucursal
                          </span>
                        )}
                        {delta !== undefined && delta !== 0 && (
                          <span className={`text-xs font-bold ${delta > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {r.claims_count} cobros · {formatMoney(r.sales_total)} · {r.new_customers} clientes nuevos
                      </p>
                    </div>
                  </div>
                  <div className="text-xl font-black tabular-nums text-[#2563EB]">{r.score.toLocaleString('es-MX')}</div>
                </div>
              );
            })}
          </div>
        )}

        {data && (
          <p className="text-center text-[11px] text-stone-400 mt-6">
            Actualizado: {new Date(data.updated_at).toLocaleTimeString('es-MX')}
          </p>
        )}
      </div>
    </div>
  );
}
