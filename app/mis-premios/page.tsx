'use client';

import { useState } from 'react';
import Link from 'next/link';
import PushNotificationManager from '@/app/components/PushNotificationManager';

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
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Tier configuration ──────────────────────────────────────────────────────
const TIER = {
  bronze: { label: 'Bronce', emoji: '🥉', gradient: 'linear-gradient(135deg,#1E40AF,#1D4ED8)', bar: '#38BDF8', next: 'Plata', min: 0, max: 100 },
  silver: { label: 'Plata',  emoji: '🥈', gradient: 'linear-gradient(135deg,#374151,#6b7280)', bar: '#94a3b8', next: 'Oro',   min: 100, max: 300 },
  gold:   { label: 'Oro',    emoji: '🥇', gradient: 'linear-gradient(135deg,#1E40AF,#ca8a04)', bar: '#fde047', next: '',      min: 300, max: 300 },
};

// ── Points card ─────────────────────────────────────────────────────────────
function PointsCard({ points }: { points: CustomerPoints }) {
  if (!points) return null;
  const cfg = TIER[points.tier];
  const pct = points.tier === 'gold' ? 100
    : Math.min(100, Math.round(((points.total_points - cfg.min) / (cfg.max - cfg.min)) * 100));

  return (
    <div className="rounded-3xl overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      <div className="relative px-6 pt-6 pb-7 overflow-hidden" style={{ background: cfg.gradient }}>
        {/* Background pattern */}
        <div aria-hidden className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '22px 22px' }} />
        {/* Glow orb */}
        <div aria-hidden className="absolute -top-10 -right-10 w-44 h-44 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6), transparent)' }} />

        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.18em] mb-1.5">Tus puntos</p>
              <p className="text-white font-black leading-none tabular-nums" style={{ fontSize: 52 }}>
                {points.total_points.toLocaleString('es-ES')}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="flex items-center gap-1.5 text-sm font-extrabold px-3.5 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>
                {cfg.emoji} {cfg.label}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-2.5">
            <div className="flex justify-between text-[11px] font-semibold text-white/60 mb-1.5">
              <span>{cfg.label}</span>
              {cfg.next && <span>{cfg.next}</span>}
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: cfg.bar }} />
            </div>
          </div>
          <p className="text-white/70 text-xs font-semibold">
            {points.tier === 'gold'
              ? '⭐ Nivel máximo alcanzado'
              : `${cfg.max - points.total_points} puntos para nivel ${cfg.next}`}
          </p>
        </div>
      </div>

      <div className="bg-white px-6 py-3.5 flex items-center justify-between border-t border-[#F0EDE8]">
        <p className="text-[#78716c] text-xs">
          <span className="font-bold text-[#1C1917]">{points.lifetime_points.toLocaleString('es-ES')}</span> puntos acumulados en total
        </p>
        <svg className="w-4 h-4" style={{ color: '#38BDF8' }} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>
    </div>
  );
}

// ── Prize card ───────────────────────────────────────────────────────────────
function PrizeCard({ claim, index }: { claim: ClaimRecord; index: number }) {
  const delivered = claim.status === 'delivered';
  const today = new Date().toISOString().split('T')[0];
  const expired = !delivered && today > claim.end_date;
  const folio = claim.id.slice(-8).toUpperCase();

  const statusConfig = delivered
    ? { label: 'Entregado', dot: '#16a34a', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', stripe: 'linear-gradient(90deg,#16a34a,#4ade80)' }
    : expired
    ? { label: 'Vencido',   dot: '#a8a29e', bg: '#f5f5f4', color: '#78716c', border: '#E8E3DC', stripe: 'linear-gradient(90deg,#d6d3d1,#a8a29e)' }
    : { label: 'Pendiente', dot: '#2563EB', bg: '#EFF6FF', color: '#0369A1', border: '#BAE6FD', stripe: 'linear-gradient(90deg,#2563EB,#0EA5E9)' };

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden border border-[#E8E3DC] transition-all duration-200 hover:-translate-y-0.5"
      style={{ boxShadow: '0 2px 12px rgba(28,25,23,0.06)', animationDelay: `${index * 60}ms` }}
    >
      {/* Top color stripe */}
      <div className="h-1" style={{ background: statusConfig.stripe }} />

      <div className="px-4 pt-3.5 pb-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: statusConfig.bg, border: `1px solid ${statusConfig.border}` }}>
            {delivered ? (
              <svg className="w-5 h-5" style={{ color: '#16a34a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : expired ? (
              <svg className="w-5 h-5" style={{ color: '#a8a29e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" style={{ color: '#2563EB' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-extrabold text-[#1C1917] text-sm leading-snug truncate">{claim.prize_name}</p>
              <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: statusConfig.bg, color: statusConfig.color, border: `1px solid ${statusConfig.border}` }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusConfig.dot }} />
                {statusConfig.label}
              </span>
            </div>

            <p className="text-[#a8a29e] text-xs mt-1">{formatDate(claim.claimed_at)}</p>

            {claim.status === 'delivered' && claim.delivered_at && (
              <p className="text-[11px] font-semibold mt-1" style={{ color: '#16a34a' }}>
                ✓ Cobrado el {formatDate(claim.delivered_at)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F0EDE8]">
          <p className="text-[#a8a29e] text-[10px] font-mono tracking-wider">#{folio}</p>
          {!delivered && !expired && (
            <span className="text-[10px] font-semibold text-[#78716c]">
              Válido hasta {formatDate(claim.end_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stats summary strip ──────────────────────────────────────────────────────
function StatStrip({ claims }: { claims: ClaimRecord[] }) {
  const pending   = claims.filter(c => c.status === 'pending' && new Date().toISOString().split('T')[0] <= c.end_date).length;
  const delivered = claims.filter(c => c.status === 'delivered').length;
  const total     = claims.length;

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Total', value: total, color: '#1C1917', bg: '#FAFAF9', border: '#E8E3DC' },
        { label: 'Pendientes', value: pending, color: '#2563EB', bg: '#EFF6FF', border: '#BAE6FD' },
        { label: 'Cobrados', value: delivered, color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
      ].map(s => (
        <div key={s.label} className="rounded-2xl px-3 py-3.5 text-center"
          style={{ background: s.bg, border: `1px solid ${s.border}` }}>
          <p className="font-black text-2xl leading-none tabular-nums" style={{ color: s.color }}>{s.value}</p>
          <p className="text-[10px] font-bold mt-1" style={{ color: s.color, opacity: 0.7 }}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
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
      if (claimsData.claims?.length > 0) setName(claimsData.claims[0].full_name);
      if (pointsRes.ok) {
        const pd = await pointsRes.json();
        setCustomerPoints(pd.points ?? null);
      }
      setSearched(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const firstName = name.split(' ')[0];

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF9' }}>

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(145deg,#2563EB 0%,#0891B2 55%,#1E3A8A 100%)' }}>
        {/* Decorative circles */}
        <div aria-hidden className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-[0.08]"
          style={{ background: 'white' }} />
        <div aria-hidden className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-[0.06]"
          style={{ background: 'white' }} />

        <div className="relative max-w-lg mx-auto px-5 pt-12 pb-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-extrabold text-base leading-tight">3E</p>
              <p className="text-white/60 text-xs">Plataforma de Premios</p>
            </div>
          </div>

          <h1 className="text-white font-black leading-tight mb-1" style={{ fontSize: 30 }}>
            {searched && firstName ? `Hola, ${firstName} 👋` : 'Mis Premios'}
          </h1>
          <p className="text-white/70 text-sm">
            {searched && firstName
              ? 'Aquí están todos tus premios y puntos'
              : 'Consulta tus premios y puntos acumulados'}
          </p>

          {/* Nav pills */}
          <div className="flex gap-2 mt-6">
            <span className="px-5 py-2 rounded-full text-sm font-extrabold"
              style={{ background: 'rgba(255,255,255,0.95)', color: '#2563EB' }}>
              Premios
            </span>
            <Link href="/mis-mensajes"
              className="px-5 py-2 rounded-full text-sm font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.25)' }}>
              Mensajes
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── SEARCH CARD ── */}
        <div className="bg-white rounded-3xl border border-[#E8E3DC] overflow-hidden"
          style={{ boxShadow: '0 4px 24px rgba(28,25,23,0.08)' }}>
          <div className="px-5 py-4 border-b border-[#F0EDE8]" style={{ background: '#FAFAF9' }}>
            <p className="text-[11px] font-extrabold text-[#1C1917] uppercase tracking-widest">Busca tus premios</p>
            <p className="text-[#a8a29e] text-xs mt-0.5">Ingresa el teléfono o correo que usaste al registrarte</p>
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[#a8a29e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="Ej: 612 345 678 o tu@correo.com"
                  required
                  autoComplete="off"
                  className="w-full border border-[#E8E3DC] rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#1C1917] placeholder-[#a8a29e] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                  style={{ background: '#FAFAF9' }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !contact.trim()}
                className="w-full font-extrabold py-4 rounded-xl text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg,#2563EB,#0891B2)',
                  boxShadow: loading || !contact.trim() ? 'none' : '0 6px 20px rgba(37,99,235,0.30)',
                }}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Buscando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Ver mis premios
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── PUSH NOTIFICATIONS ── */}
        <div className="flex justify-start">
          <PushNotificationManager phone={contact.trim() || undefined} />
        </div>

        {/* ── RESULTS ── */}
        {searched && claims !== null && (
          <>
            {/* Points card */}
            {customerPoints && <PointsCard points={customerPoints} />}

            {claims.length === 0 ? (
              /* Empty state */
              <div className="bg-white rounded-3xl border border-[#E8E3DC] p-10 text-center"
                style={{ boxShadow: '0 2px 16px rgba(28,25,23,0.06)' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'linear-gradient(135deg,#EFF6FF,#BAE6FD)' }}>
                  <svg className="w-10 h-10" style={{ color: '#0EA5E9' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                  </svg>
                </div>
                <p className="font-extrabold text-[#1C1917] text-base mb-1.5">Sin premios aún</p>
                <p className="text-[#78716c] text-sm leading-relaxed">
                  No encontramos premios con ese contacto.<br />
                  Verifica el número o correo que usaste al registrarte.
                </p>
              </div>
            ) : (
              <>
                {/* Stats strip */}
                <StatStrip claims={claims} />

                {/* Section label */}
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] font-extrabold text-[#1C1917] uppercase tracking-widest">
                    {claims.length} {claims.length === 1 ? 'Premio' : 'Premios'}
                  </p>
                  <p className="text-[11px] text-[#a8a29e] font-semibold">ordenados por fecha</p>
                </div>

                {/* Prize list */}
                <div className="space-y-3">
                  {claims.map((claim, i) => (
                    <PrizeCard key={claim.id} claim={claim} index={i} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-4 h-4 rounded-md flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)' }}>
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7" />
            </svg>
          </div>
          <p className="text-[#a8a29e] text-xs font-medium">3E · by ENM</p>
        </div>
      </div>
    </div>
  );
}
