'use client';

import { useState } from 'react';
import Link from 'next/link';

type ClaimRecord = {
  id: string;
  prize_id: string;
  full_name: string;
  phone: string;
  email: string;
  claimed_at: string;
  status: 'pending' | 'delivered';
  delivered_at: string | null;
  location: string | null;
  prize_name: string;
  prize_location: string;
  start_date: string;
  end_date: string;
};

type CustomerPoints = {
  id: string;
  phone: string;
  email: string;
  total_points: number;
  lifetime_points: number;
  tier: 'bronze' | 'silver' | 'gold';
  updated_at: string;
} | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

const TIER_CONFIG = {
  bronze: {
    label: 'Bronce',
    icon: '🥉',
    gradient: 'linear-gradient(135deg,#92400e,#b45309)',
    badgeBg: '#fef3c7',
    badgeColor: '#92400e',
    badgeBorder: '#fcd34d',
    barColor: '#fbbf24',
    nextLabel: 'Plata',
    min: 0,
    max: 100,
  },
  silver: {
    label: 'Plata',
    icon: '🥈',
    gradient: 'linear-gradient(135deg,#374151,#6b7280)',
    badgeBg: '#f1f5f9',
    badgeColor: '#374151',
    badgeBorder: '#cbd5e1',
    barColor: '#94a3b8',
    nextLabel: 'Oro',
    min: 100,
    max: 300,
  },
  gold: {
    label: 'Oro',
    icon: '🥇',
    gradient: 'linear-gradient(135deg,#854d0e,#ca8a04)',
    badgeBg: '#fefce8',
    badgeColor: '#713f12',
    badgeBorder: '#fde047',
    barColor: '#fde047',
    nextLabel: '',
    min: 300,
    max: 300,
  },
};

function TierCard({ points }: { points: CustomerPoints }) {
  if (!points) return null;
  const cfg = TIER_CONFIG[points.tier];
  const pct = points.tier === 'gold'
    ? 100
    : Math.min(100, Math.round(((points.total_points - cfg.min) / (cfg.max - cfg.min)) * 100));
  const remaining = cfg.max - points.total_points;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
      {/* Top gradient */}
      <div className="px-6 pt-6 pb-5 text-white relative overflow-hidden" style={{ background: cfg.gradient }}>
        {/* Subtle dot pattern */}
        <div aria-hidden className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

        <div className="relative flex items-start justify-between mb-5">
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Tus puntos</p>
            <p className="text-5xl font-black leading-none tabular-nums">
              {points.total_points.toLocaleString('es-ES')}
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            {cfg.icon} Nivel {cfg.label}
          </span>
        </div>

        {/* Progress bar */}
        {points.tier !== 'gold' ? (
          <>
            <div className="h-2 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: cfg.barColor }} />
            </div>
            <p className="text-white/70 text-xs font-semibold">
              {remaining > 0
                ? `${remaining} puntos más para nivel ${cfg.nextLabel}`
                : `¡Ya alcanzaste el nivel ${cfg.nextLabel}!`}
            </p>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-2 rounded-full flex-1" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-2 rounded-full w-full" style={{ background: cfg.barColor }} />
            </div>
            <span className="text-white/80 text-xs font-semibold shrink-0">Nivel máximo ✓</span>
          </div>
        )}
      </div>

      {/* Bottom strip */}
      <div className="bg-white px-6 py-3.5 flex items-center justify-between">
        <p className="text-[#78716c] text-xs">
          <span className="font-bold text-[#1C1917]">{points.lifetime_points.toLocaleString('es-ES')}</span> puntos acumulados en total
        </p>
        <svg className="w-4 h-4 text-[#E8E3DC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </div>
    </div>
  );
}

function PrizeCard({ claim }: { claim: ClaimRecord }) {
  const delivered = claim.status === 'delivered';
  const today = new Date().toISOString().split('T')[0];
  const expired = today > claim.end_date;

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[#E8E3DC]"
      style={{ boxShadow: '0 1px 8px rgba(28,25,23,0.06)' }}>
      {/* Color stripe */}
      <div className="h-1 w-full" style={{
        background: delivered
          ? 'linear-gradient(90deg,#16a34a,#4ade80)'
          : expired
          ? 'linear-gradient(90deg,#a8a29e,#d6d3d1)'
          : 'linear-gradient(90deg,#E8521A,#fb923c)',
      }} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: delivered ? '#f0fdf4' : expired ? '#f5f5f4' : '#fff7ed' }}>
            {delivered
              ? <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              : expired
              ? <svg className="w-5 h-5 text-[#a8a29e]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              : <svg className="w-5 h-5 text-[#E8521A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-bold text-[#1C1917] text-sm leading-tight truncate">{claim.prize_name}</p>
              {/* Status badge */}
              <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={delivered
                  ? { background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }
                  : expired
                  ? { background: '#f5f5f4', color: '#78716c', borderColor: '#E8E3DC' }
                  : { background: '#fff7ed', color: '#E8521A', borderColor: '#fed7aa' }
                }>
                {delivered ? '✓ Entregado' : expired ? 'Vencido' : '⏳ Pendiente'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#78716c]">
              <span>{formatDate(claim.claimed_at)}</span>
              {(claim.location || claim.prize_location) && (
                <>
                  <span className="text-[#E8E3DC]">·</span>
                  <span className="truncate">{claim.location || claim.prize_location}</span>
                </>
              )}
            </div>

            {claim.status === 'delivered' && claim.delivered_at && (
              <p className="text-[10px] text-green-600 font-semibold mt-1.5">
                Cobrado el {formatDate(claim.delivered_at)}
              </p>
            )}
          </div>
        </div>

        {/* Folio */}
        <p className="text-right text-[10px] text-[#a8a29e] font-mono mt-2">
          #{claim.id.slice(-8).toUpperCase()}
        </p>
      </div>
    </div>
  );
}

export default function MisPremiosPage() {
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claims, setClaims] = useState<ClaimRecord[] | null>(null);
  const [customerPoints, setCustomerPoints] = useState<CustomerPoints>(null);
  const [searched, setSearched] = useState(false);
  const [name, setName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) return;
    setLoading(true);
    setError('');
    setClaims(null);
    setCustomerPoints(null);
    setSearched(false);
    setName('');
    try {
      const [claimsRes, pointsRes] = await Promise.all([
        fetch(`/api/claims/by-contact?contact=${encodeURIComponent(contact.trim())}`),
        fetch(`/api/customer-points?contact=${encodeURIComponent(contact.trim())}`),
      ]);
      const claimsData = await claimsRes.json();
      if (!claimsRes.ok) { setError(claimsData.error || 'Error al buscar.'); return; }
      setClaims(claimsData.claims);
      if (claimsData.claims?.length > 0) {
        setName(claimsData.claims[0].full_name);
      }
      if (pointsRes.ok) {
        const pointsData = await pointsRes.json();
        setCustomerPoints(pointsData.points ?? null);
      }
      setSearched(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">

      {/* ── HEADER ── */}
      <div style={{ background: 'linear-gradient(135deg,#E8521A 0%,#C2410C 100%)' }}>
        <div className="max-w-lg mx-auto px-5 pt-10 pb-8 text-center">

          {/* Logo mark */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
            </svg>
          </div>

          <h1 className="text-2xl font-black text-white mb-1 tracking-tight">
            {searched && name ? `Hola, ${name.split(' ')[0]} 👋` : 'Mis Premios'}
          </h1>
          <p className="text-white/70 text-sm">
            {searched && name ? 'Aquí están todos tus premios' : 'Consulta tus premios y puntos acumulados'}
          </p>

          {/* Tab nav */}
          <div className="flex justify-center gap-2 mt-5">
            <span className="px-5 py-2 rounded-full text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#E8521A' }}>
              Premios
            </span>
            <Link href="/mis-mensajes"
              className="px-5 py-2 rounded-full text-sm font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              Mensajes
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── SEARCH ── */}
        <div className="bg-white rounded-2xl p-5 border border-[#E8E3DC]"
          style={{ boxShadow: '0 2px 16px rgba(28,25,23,0.06)' }}>
          <p className="text-[10px] font-bold text-[#78716c] uppercase tracking-widest mb-3">Buscar por contacto</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a8a29e]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <input
                type="text"
                value={contact}
                onChange={e => setContact(e.target.value)}
                placeholder="Celular o correo electrónico"
                required
                autoComplete="off"
                className="w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl pl-10 pr-4 py-3 text-sm text-[#1C1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#E8521A]/20 focus:border-[#E8521A] transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm flex gap-2 items-center">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !contact.trim()}
              className="w-full font-bold py-3.5 rounded-xl text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{
                background: loading ? '#fed7aa' : 'linear-gradient(135deg,#E8521A,#C2410C)',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(232,82,26,0.28)',
              }}
            >
              {loading
                ? <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Buscando...
                  </>
                : <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar mis premios
                  </>
              }
            </button>
          </form>
        </div>

        {/* ── RESULTS ── */}
        {searched && claims !== null && (
          <>
            {/* Points card */}
            {customerPoints && <TierCard points={customerPoints} />}

            {claims.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center border border-[#E8E3DC]"
                style={{ boxShadow: '0 2px 16px rgba(28,25,23,0.06)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#fff7ed' }}>
                  <svg className="w-8 h-8 text-[#fed7aa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                  </svg>
                </div>
                <p className="font-bold text-[#1C1917] text-base mb-1">No encontramos premios</p>
                <p className="text-[#78716c] text-sm">Verifica el número de celular o correo que usaste al registrarte.</p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold text-[#78716c] uppercase tracking-widest px-1">
                  {claims.length} {claims.length === 1 ? 'premio encontrado' : 'premios encontrados'}
                </p>
                <div className="space-y-3">
                  {claims.map(claim => (
                    <PrizeCard key={claim.id} claim={claim} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <p className="text-center text-[#a8a29e] text-xs py-4">
          Tierra Burrito Bar · premia-tierra.vercel.app
        </p>
      </div>
    </div>
  );
}
