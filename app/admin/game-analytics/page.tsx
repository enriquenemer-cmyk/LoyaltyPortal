'use client';

import { useEffect, useState } from 'react';
import HourHeatmap from '@/app/components/HourHeatmap';

type ByType = {
  game_type: string;
  play_count: number;
  completion_rate: number;
  avg_time_ms: number | null;
};

type HourlyEntry = { hour: number; count: number };
type PrizeEntry = { prize_won: string; count: number };

type AnalyticsData = {
  rows: unknown[];
  byType: ByType[];
  hourly: HourlyEntry[];
  prizes: PrizeEntry[];
};

const GAME_LABELS: Record<string, string> = {
  slots: '🎰 Tragamonedas',
  roulette: '🎡 Ruleta',
  penalty: '⚽ Penales',
  scratch: '🃏 Rasca y Gana',
};

function fmtMs(ms: number | null): string {
  if (!ms) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-extrabold text-[#1C1917]">{value}</p>
      {sub && <p className="text-xs text-stone-400">{sub}</p>}
    </div>
  );
}

function GameTypeCard({ data }: { data: ByType }) {
  const label = GAME_LABELS[data.game_type] ?? data.game_type;
  return (
    <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-bold text-[#1C1917] mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Partidas</span>
          <span className="font-bold text-[#1C1917]">{data.play_count}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Tasa de completado</span>
          <span className="font-bold text-blue-600">{data.completion_rate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-stone-500">Tiempo promedio</span>
          <span className="font-bold text-[#1C1917]">{fmtMs(data.avg_time_ms)}</span>
        </div>
        {/* Completion rate bar */}
        <div className="mt-2 h-1.5 rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${Math.min(data.completion_rate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PrizeDistribution({ data }: { data: PrizeEntry[] }) {
  const total = data.reduce((s, e) => s + e.count, 0) || 1;
  return (
    <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 shadow-sm">
      <p className="text-sm font-bold text-[#1C1917] mb-4">Distribución de premios ganados</p>
      {data.length === 0 ? (
        <p className="text-xs text-stone-400">Sin datos aun.</p>
      ) : (
        <div className="space-y-2.5">
          {data.map((entry) => {
            const pct = Math.round((entry.count / total) * 100);
            return (
              <div key={entry.prize_won}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="truncate text-[#1C1917] font-medium max-w-[70%]">{entry.prize_won}</span>
                  <span className="text-stone-400 shrink-0">{entry.count} ({pct}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2563EB] transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GameAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/game-analytics')
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d: AnalyticsData) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-stone-400 text-sm animate-pulse">Cargando analíticas...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Error al cargar datos: {error}
        </div>
      </div>
    );
  }

  const totalGames = data.byType.reduce((s, t) => s + t.play_count, 0);
  const totalCompleted = data.byType.reduce((s, t) => s + Math.round(t.play_count * t.completion_rate / 100), 0);
  const overallCompletionRate = totalGames > 0 ? Math.round((totalCompleted / totalGames) * 100) : 0;

  const avgTimeMs = (() => {
    const withTime = data.byType.filter((t) => t.avg_time_ms !== null);
    if (!withTime.length) return null;
    const totalPlays = withTime.reduce((s, t) => s + t.play_count, 0);
    const weighted = withTime.reduce((s, t) => s + (t.avg_time_ms ?? 0) * t.play_count, 0);
    return totalPlays > 0 ? weighted / totalPlays : null;
  })();

  const mostPopular = data.byType.length > 0
    ? (GAME_LABELS[data.byType[0].game_type] ?? data.byType[0].game_type)
    : '—';

  const GAME_TYPES = ['slots', 'roulette', 'penalty', 'scratch'];
  const allGameTypes: ByType[] = GAME_TYPES.map((gt) => {
    return data.byType.find((t) => t.game_type === gt) ?? {
      game_type: gt,
      play_count: 0,
      completion_rate: 0,
      avg_time_ms: null,
    };
  });

  const hourlyFilled = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: data.hourly.find((e) => e.hour === h)?.count ?? 0,
  }));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            🎮 Analítica de Juegos
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Analítica de Juegos</h1>
          <p className="text-blue-200/70 mt-1.5 text-sm">Métricas de rendimiento de los juegos interactivos</p>
        </div>
      </div>

    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total partidas" value={totalGames.toLocaleString()} />
        <StatCard
          label="% completan formulario"
          value={`${overallCompletionRate}%`}
          sub={`${totalCompleted} de ${totalGames}`}
        />
        <StatCard label="Tiempo promedio" value={fmtMs(avgTimeMs)} sub="por juego" />
        <StatCard label="Juego mas popular" value={mostPopular} />
      </div>

      {/* Game type comparison */}
      <div>
        <h2 className="text-sm font-bold text-stone-500 uppercase tracking-wide mb-3">Por tipo de juego</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {allGameTypes.map((t) => (
            <GameTypeCard key={t.game_type} data={t} />
          ))}
        </div>
      </div>

      {/* Hourly heatmap + Prize distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HourHeatmap hours={hourlyFilled} />
        <PrizeDistribution data={data.prizes} />
      </div>
    </div>
    </div>
  );
}
