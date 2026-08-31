'use client';
import { LightBulbIcon, RectangleGroupIcon, SparklesIcon, ChartBarIcon } from '@heroicons/react/24/outline';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/app/components/Toast';

const GAMES = [
  {
    id: 'slots',
    emoji: '',
    name: 'Tragamonedas',
    desc: 'Tres carretes que giran al tocar la pantalla. Si coinciden los símbolos, el cliente gana el premio.',
    badge: 'Clásico',
    badgeColor: '#F97316',
    href: '/admin/generate?game_type=slots',
  },
  {
    id: 'roulette',
    emoji: '',
    name: 'Ruleta de la Suerte',
    desc: 'Ruleta con 8 segmentos. El cliente gira y donde caiga la flecha, ese es su premio.',
    badge: 'Popular',
    badgeColor: '#059669',
    href: '/admin/generate?game_type=roulette',
  },
  {
    id: 'penalty',
    emoji: '',
    name: 'Tiro de Penalti',
    desc: 'El cliente elige un ángulo y lanza el balón. Si entra, gana el premio instantáneamente.',
    badge: 'Deportivo',
    badgeColor: '#F97316',
    href: '/admin/generate?game_type=penalty',
  },
  {
    id: 'scratch',
    emoji: '🃏',
    name: 'Rasca y Gana',
    desc: 'Tarjeta dorada que el cliente raspa con el dedo. Debajo aparece si ganó o no.',
    badge: 'Retro',
    badgeColor: '#D97706',
    href: '/admin/generate?game_type=scratch',
  },
];

const GAME_TYPE_LABEL: Record<string, string> = {
  roulette: 'Ruleta',
  slots: 'Tragamonedas',
  penalty: 'Penalti',
  scratch: 'Rasca y Gana',
};

type Prize = {
  id: string;
  name: string;
  description: string;
  probability: number;
  max_winners: number | null;
  winners_count: number;
};

type Bundle = {
  id: string;
  name: string;
  game_type: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  active: boolean;
  prize_count: number;
  play_count: number;
  prizes?: Prize[];
};

type Restaurant = { id: string; name: string };

type PrizeAnalytics = {
  id: string;
  name: string;
  probability: number;
  max_winners: number | null;
  winners_count: number;
  play_count: number;
  redemption_count: number;
};

type BundleAnalytics = {
  total_plays: number;
  total_redemptions: number;
  prizes: PrizeAnalytics[];
};

function AnalyticsModal({ bundle, onClose }: { bundle: Bundle; onClose: () => void }) {
  const [data, setData] = useState<BundleAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/game-bundles/${bundle.id}/analytics`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Error al cargar analíticas');
        if (!cancelled) setData(d.analytics);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar analíticas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [bundle.id]);

  const redemptionRate = data && data.total_plays > 0
    ? Math.round((data.total_redemptions / data.total_plays) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-1 flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5" style={{ color: '#F97316' }} aria-hidden="true" />
          Analíticas — {bundle.name}
        </h2>
        <p className="text-sm text-slate-400 mb-4">Qué premio se gana más y cuántos clientes reclaman de verdad.</p>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Cargando...</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">{error}</div>
        ) : !data || data.total_plays === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Aún nadie ha jugado esta campaña.</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-[#1C1917]">{data.total_plays}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Jugadas</p>
              </div>
              <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-[#1C1917]">{data.total_redemptions}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Reclamados</p>
              </div>
              <div className="bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl p-3 text-center">
                <p className="text-2xl font-black" style={{ color: redemptionRate >= 50 ? '#1a6b3c' : '#F97316' }}>{redemptionRate}%</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Tasa de reclamo</p>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Distribución de premios</p>
            <div className="space-y-3">
              {data.prizes.map((p) => {
                const winPct = data.total_plays > 0 ? Math.round((p.play_count / data.total_plays) * 100) : 0;
                const prizeRedemptionRate = p.play_count > 0 ? Math.round((p.redemption_count / p.play_count) * 100) : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-[#1C1917]">{p.name}</span>
                      <span className="text-slate-400">
                        {p.play_count} {p.play_count === 1 ? 'jugada' : 'jugadas'} · {p.redemption_count} reclamados ({prizeRedemptionRate}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#F3EFE9] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${winPct}%`, background: 'linear-gradient(90deg,#F97316,#EA580C)' }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{winPct}% de las jugadas · configurado al {p.probability}%</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function getAppOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://premia-tierra.vercel.app';
}

function NewBundleModal({
  restaurants,
  onClose,
  onCreated,
}: {
  restaurants: Restaurant[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [gameType, setGameType] = useState('roulette');
  const [restaurantId, setRestaurantId] = useState('');
  const [prizes, setPrizes] = useState([
    { name: '', description: '', probability: '50', max_winners: '' },
    { name: '', description: '', probability: '50', max_winners: '' },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const total = prizes.reduce((sum, p) => sum + (Number(p.probability) || 0), 0);

  function updatePrize(i: number, field: string, value: string) {
    setPrizes((prev) => prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)));
  }
  function addPrize() {
    if (prizes.length >= 8) return;
    setPrizes((prev) => [...prev, { name: '', description: '', probability: '0', max_winners: '' }]);
  }
  function removePrize(i: number) {
    if (prizes.length <= 2) return;
    setPrizes((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!name.trim()) { setError('El nombre de la campaña es requerido'); return; }
    if (prizes.some((p) => !p.name.trim())) { setError('Cada premio necesita un nombre'); return; }
    if (total !== 100) { setError(`Las probabilidades deben sumar 100 (llevas ${total})`); return; }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/game-bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          game_type: gameType,
          restaurant_id: restaurantId || null,
          prizes: prizes.map((p) => ({
            name: p.name.trim(),
            description: p.description.trim() || p.name.trim(),
            probability: Number(p.probability) || 0,
            max_winners: p.max_winners ? Number(p.max_winners) : null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la campaña');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la campaña');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-1">Nueva campaña de juego</h2>
        <p className="text-sm text-slate-400 mb-4">Un link público que puedes compartir — el cliente juega y registra sus datos, sin necesidad de un premio individual.</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre de la campaña</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Ruleta de Verano"
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tipo de juego</label>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
              >
                <option value="roulette">Ruleta</option>
                <option value="slots">Tragamonedas</option>
                <option value="penalty">Penalti</option>
                <option value="scratch">Rasca y Gana</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Restaurante</label>
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
              >
                <option value="">Todos</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Premios (2-8)</label>
              <span className={`text-xs font-bold ${total === 100 ? 'text-emerald-600' : 'text-red-500'}`}>
                Total: {total}%
              </span>
            </div>
            <div className="space-y-2">
              {prizes.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={p.name}
                    onChange={(e) => updatePrize(i, 'name', e.target.value)}
                    placeholder={`Premio ${i + 1}`}
                    className="flex-1 px-2.5 py-2 border border-[#E8E3DC] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={p.probability}
                    onChange={(e) => updatePrize(i, 'probability', e.target.value)}
                    className="w-16 px-2 py-2 border border-[#E8E3DC] rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                  />
                  <span className="text-xs text-slate-400">%</span>
                  {prizes.length > 2 && (
                    <button onClick={() => removePrize(i)} className="text-slate-400 hover:text-red-500 text-sm px-1" aria-label="Quitar">✕</button>
                  )}
                </div>
              ))}
            </div>
            {prizes.length < 8 && (
              <button onClick={addPrize} className="mt-2 text-xs font-bold text-[#F97316] hover:underline">
                + Agregar otro premio
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-red-600 text-xs font-semibold mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}
          >
            {saving ? 'Creando...' : 'Crear campaña'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GameBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [analyticsBundle, setAnalyticsBundle] = useState<Bundle | null>(null);
  const toast = useToast();

  const fetchBundles = useCallback(async () => {
    try {
      const res = await fetch('/api/game-bundles');
      const data = await res.json();
      if (res.ok) setBundles(data.bundles ?? []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchBundles(),
      fetch('/api/restaurants').then((r) => r.json()).then((d) => setRestaurants(d.restaurants ?? [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [fetchBundles]);

  async function handleToggle(bundle: Bundle) {
    try {
      const res = await fetch(`/api/game-bundles/${bundle.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !bundle.active }),
      });
      if (!res.ok) throw new Error();
      await fetchBundles();
    } catch {
      toast.error('No se pudo actualizar la campaña.');
    }
  }

  function copyLink(bundle: Bundle) {
    const url = `${getAppOrigin()}/jugar/${bundle.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(bundle.id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => toast.error('No se pudo copiar el link.'));
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <RectangleGroupIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Juegos con Premios
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Premios Gamificados</h1>
          <p className="text-orange-200/70 mt-1.5 text-sm max-w-xl">
            Convierte cada premio en una experiencia. El cliente escanea el QR y antes de ver su premio, juega un mini-juego. Más emoción, más recuerdo de marca.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">

        {/* How it works banner */}
        <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 mb-8 flex gap-4 items-start">
          <div className="text-2xl shrink-0"><LightBulbIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
          <div>
            <p className="text-sm font-bold text-[#1C1917] mb-1">¿Cómo funciona?</p>
            <ol className="text-sm text-[#6b7280] space-y-0.5 list-decimal list-inside">
              <li>Genera un premio normal en <strong className="text-[#1C1917]">Generar Premio</strong></li>
              <li>En el paso 2, selecciona el tipo de juego</li>
              <li>El cliente escanea el QR → juega → descubre su premio</li>
              <li>Va al cajero a cobrarlo como siempre</li>
            </ol>
          </div>
        </div>

        {/* Game cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="bg-white border border-[#E8E3DC] rounded-2xl p-6 hover:border-[#F97316]/40 hover:shadow-md transition-all group flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div className="text-4xl">{game.emoji}</div>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider text-white"
                  style={{ background: game.badgeColor }}
                >
                  {game.badge}
                </span>
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1C1917] mb-1 group-hover:text-[#F97316] transition-colors">{game.name}</h2>
                <p className="text-sm text-[#6b7280] leading-relaxed">{game.desc}</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-[#F97316] mt-auto pt-1">
                Generar premio con este juego
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Campañas de juego (multi-premio) ── */}
        <div className="bg-white border border-[#E8E3DC] rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-[#E8E3DC] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                <SparklesIcon className="w-5 h-5" style={{ color: '#F97316' }} aria-hidden="true" />
                Campañas de juego
              </h2>
              <p className="text-xs text-[#6b7280] mt-0.5">Un link público con varios premios y probabilidades — compártelo sin necesidad de generar un QR por cliente.</p>
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all shadow-sm"
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}
            >
              + Nueva campaña
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">Cargando...</div>
          ) : bundles.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">Sin campañas creadas aún.</div>
          ) : (
            <div className="divide-y divide-[#F3EFE9]">
              {bundles.map((b) => (
                <div key={b.id} className="px-6 py-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-[#1C1917]">{b.name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {GAME_TYPE_LABEL[b.game_type] ?? b.game_type}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-500 border border-stone-200'}`}>
                        {b.active ? 'Activa' : 'Pausada'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {b.prize_count} {b.prize_count === 1 ? 'premio' : 'premios'} · {b.play_count} {b.play_count === 1 ? 'jugada' : 'jugadas'}
                      {b.restaurant_name ? ` · ${b.restaurant_name}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => copyLink(b)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors whitespace-nowrap"
                  >
                    {copiedId === b.id ? '¡Copiado!' : 'Copiar link'}
                  </button>
                  <button
                    onClick={() => setAnalyticsBundle(b)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors whitespace-nowrap flex items-center gap-1"
                  >
                    <ChartBarIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    Analíticas
                  </button>
                  <button
                    onClick={() => handleToggle(b)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                      b.active ? 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100' : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {b.active ? 'Pausar' : 'Reactivar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-[#F97316] to-[#c94315] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-lg">¿Listo para crear tu primer juego?</p>
            <p className="text-white/75 text-sm mt-0.5">Elige un juego arriba o genera desde el panel principal.</p>
          </div>
          <Link
            href="/admin/generate"
            className="shrink-0 bg-white text-[#F97316] font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-center"
          >
            Generar Premio →
          </Link>
        </div>

      </div>

      {showNew && (
        <NewBundleModal
          restaurants={restaurants}
          onClose={() => setShowNew(false)}
          onCreated={fetchBundles}
        />
      )}

      {analyticsBundle && (
        <AnalyticsModal
          bundle={analyticsBundle}
          onClose={() => setAnalyticsBundle(null)}
        />
      )}
    </div>
  );
}
