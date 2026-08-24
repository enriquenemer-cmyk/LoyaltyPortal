'use client';
import { UsersIcon } from '@heroicons/react/24/outline';

import { useEffect, useState, useMemo } from 'react';
import { Avatar } from '@/app/components/Avatar';
import { SkeletonCard, SkeletonTable } from '@/app/components/Skeleton';
import { EmptyState } from '@/app/components/EmptyState';

type Claim = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  prize_name: string;
  prize_location: string;
  location: string | null;
  claimed_at: string;
  status: 'pending' | 'delivered';
  delivered_at: string | null;
  delivered_by: string | null;
};

type CustomerTier = 'bronze' | 'silver' | 'gold';

type CustomerPoints = {
  phone: string;
  total_points: number;
  tier: CustomerTier;
};

type CustomerProfile = {
  email: string;
  full_name: string;
  phone: string;
  totalClaims: number;
  lastClaim: Claim;
  allClaims: Claim[];
  daysSinceLastVisit: number;
  hasPending: boolean;
  isNew: boolean;
  isFrequent: boolean;
  tier: CustomerTier;
  totalPoints: number;
};

const TIER_LABELS: Record<CustomerTier, string> = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' };

const TIER_BADGE_CLASS: Record<CustomerTier, string> = {
  bronze: 'bg-orange-50 text-orange-700 border-orange-200',
  silver: 'bg-slate-100 text-slate-700 border-slate-300',
  gold: 'bg-yellow-50 text-yellow-700 border-yellow-300',
};

function TierBadge({ tier }: { tier: CustomerTier }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wide ${TIER_BADGE_CLASS[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}

type Segment = 'todos' | 'frecuentes' | 'cumpleanos' | 'sin_canjear' | 'nuevos';

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function daysSince(dateStr: string): number {
  const now = new Date();
  const then = new Date(dateStr);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

function isBirthdayThisMonth(claims: Claim[]): boolean {
  // birth_date is not in the Claim type currently; we check if any claim
  // has a field named birth_date via a loose cast
  const now = new Date();
  const currentMonth = now.getMonth();
  for (const c of claims) {
    const loose = c as Record<string, unknown>;
    if (loose.birth_date && typeof loose.birth_date === 'string') {
      const bd = new Date(loose.birth_date);
      if (bd.getMonth() === currentMonth) return true;
    }
  }
  return false;
}


const SEGMENTS: { key: Segment; label: string; icon: string }[] = [
  { key: 'todos', label: 'Todos', icon: '' },
  { key: 'frecuentes', label: 'Frecuentes', icon: '' },
  { key: 'cumpleanos', label: 'Cumpleaños este mes', icon: '' },
  { key: 'sin_canjear', label: 'Sin canjear', icon: '⏳' },
  { key: 'nuevos', label: 'Nuevos', icon: '' },
];

function SegmentButton({
  seg,
  active,
  count,
  onClick,
}: {
  seg: (typeof SEGMENTS)[number];
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
        active
          ? 'bg-[#F97316] text-white border-[#F97316] shadow-md shadow-orange-200'
          : 'bg-white text-slate-600 border-slate-200 hover:border-[#F97316] hover:text-[#F97316]'
      }`}
    >
      <span>{seg.icon}</span>
      {seg.label}
      <span
        className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
          active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function DaysBadge({ days }: { days: number }) {
  if (days === 0)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
        Hoy
      </span>
    );
  if (days <= 7)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
        Hace {days}d
      </span>
    );
  if (days <= 30)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
        Hace {days}d
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
      Hace {days}d
    </span>
  );
}

function HistorialRow({ claim }: { claim: Claim }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-[#F97316]/40 mt-1.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-700 truncate">{claim.prize_name}</p>
        <p className="text-[10px] text-slate-400">{claim.prize_location || claim.location || '—'}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] text-slate-400">{formatDateShort(claim.claimed_at)}</p>
        {claim.status === 'delivered' ? (
          <span className="text-[10px] font-bold text-emerald-600">Entregado</span>
        ) : (
          <span className="text-[10px] font-bold text-orange-500">Pendiente</span>
        )}
      </div>
    </div>
  );
}

function CustomerRow({ customer }: { customer: CustomerProfile }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-orange-50/40 transition-colors group">
        {/* Cliente */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={customer.full_name} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 group-hover:text-[#F97316] transition-colors text-sm">
                  {customer.full_name}
                </span>
                {customer.isNew && (
                  <span className="text-[9px] font-extrabold bg-violet-100 text-[#1a6b3c] border border-violet-200 rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                    Nuevo
                  </span>
                )}
                {customer.isFrequent && (
                  <span className="text-[9px] font-extrabold bg-orange-100 text-orange-600 border border-orange-200 rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                    Frecuente
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{customer.phone}</p>
            </div>
          </div>
        </td>

        {/* Correo */}
        <td className="px-5 py-4">
          <a
            href={`mailto:${customer.email}`}
            className="text-[#F97316] hover:text-orange-700 hover:underline text-xs"
          >
            {customer.email}
          </a>
        </td>

        {/* Nivel */}
        <td className="px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <TierBadge tier={customer.tier} />
            <span className="text-[10px] text-slate-400 font-mono">{customer.totalPoints.toLocaleString('es-CO')} pts</span>
          </div>
        </td>

        {/* Total canjes */}
        <td className="px-5 py-4">
          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-[#F97316] text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            {customer.totalClaims} {customer.totalClaims === 1 ? 'canje' : 'canjes'}
          </span>
        </td>

        {/* Último canje + días */}
        <td className="px-5 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400 text-xs whitespace-nowrap">
              {formatDateShort(customer.lastClaim.claimed_at)}
            </span>
            <DaysBadge days={customer.daysSinceLastVisit} />
          </div>
        </td>

        {/* Estado último canje */}
        <td className="px-5 py-4">
          {customer.lastClaim.status === 'delivered' ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Entregado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full border border-orange-200">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pendiente
            </span>
          )}
        </td>

        {/* Historial toggle */}
        <td className="px-5 py-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              expanded
                ? 'bg-[#F97316] text-white border-[#F97316]'
                : 'bg-white text-slate-500 border-slate-200 hover:border-[#F97316] hover:text-[#F97316]'
            }`}
          >
            Ver historial
            <svg
              className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </td>
      </tr>

      {/* Expandable historial */}
      {expanded && (
        <tr>
          <td colSpan={7} className="px-5 pb-4 pt-0 bg-orange-50/30">
            <div className="ml-13 pl-3 border-l-2 border-[#F97316]/20 ml-[52px]">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 mt-1">
                Historial de canjes — {customer.totalClaims} en total
              </p>
              <div className="max-h-48 overflow-y-auto pr-1">
                {customer.allClaims.map((c) => (
                  <HistorialRow key={c.id} claim={c} />
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ClientesPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [pointsByPhone, setPointsByPhone] = useState<Map<string, CustomerPoints>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<Segment>('todos');

  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch('/api/claims');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setClaims(data.claims);
      } catch {
        setError('No se pudieron cargar los clientes.');
      } finally {
        setLoading(false);
      }
    }
    async function fetchPoints() {
      try {
        const res = await fetch('/api/customer-points');
        const data = await res.json();
        if (!res.ok) return;
        const map = new Map<string, CustomerPoints>();
        for (const p of (data.points ?? []) as CustomerPoints[]) {
          map.set(p.phone, p);
        }
        setPointsByPhone(map);
      } catch {
        // tier info is non-critical, ignore errors
      }
    }
    fetchClaims();
    fetchPoints();
  }, []);

  const customers = useMemo<CustomerProfile[]>(() => {
    const map = new Map<string, Claim[]>();
    for (const claim of claims) {
      const key = claim.email.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(claim);
    }
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return Array.from(map.entries()).map(([, claimList]) => {
      const sorted = [...claimList].sort(
        (a, b) => new Date(b.claimed_at).getTime() - new Date(a.claimed_at).getTime()
      );
      const firstEver = sorted[sorted.length - 1];
      const days = daysSince(sorted[0].claimed_at);
      const hasPending = sorted.some((c) => c.status === 'pending');
      const isNew = new Date(firstEver.claimed_at) >= thirtyDaysAgo;
      const points = pointsByPhone.get(sorted[0].phone);
      return {
        email: sorted[0].email,
        full_name: sorted[0].full_name,
        phone: sorted[0].phone,
        totalClaims: claimList.length,
        lastClaim: sorted[0],
        allClaims: sorted,
        daysSinceLastVisit: days,
        hasPending,
        isNew,
        isFrequent: claimList.length >= 2,
        tier: points?.tier ?? 'bronze',
        totalPoints: points?.total_points ?? 0,
      };
    });
  }, [claims, pointsByPhone]);

  const segmentCounts = useMemo(() => {
    return {
      todos: customers.length,
      frecuentes: customers.filter((c) => c.isFrequent).length,
      cumpleanos: customers.filter((c) => isBirthdayThisMonth(c.allClaims)).length,
      sin_canjear: customers.filter((c) => c.hasPending).length,
      nuevos: customers.filter((c) => c.isNew).length,
    };
  }, [customers]);

  const filtered = useMemo(() => {
    let list = customers;

    // Segment filter
    if (segment === 'frecuentes') list = list.filter((c) => c.isFrequent);
    else if (segment === 'cumpleanos') list = list.filter((c) => isBirthdayThisMonth(c.allClaims));
    else if (segment === 'sin_canjear') list = list.filter((c) => c.hasPending);
    else if (segment === 'nuevos') list = list.filter((c) => c.isNew);

    // Search filter
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      );
    }

    return list;
  }, [customers, segment, search]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <UsersIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Base de Clientes
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Mis Clientes</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Perfiles de todos los clientes que han canjeado premios</p>
            {!loading && customers.length > 0 && (
              <div className="flex items-center mt-3 gap-2">
                <div className="flex -space-x-2">
                  {['A','M','R','L'].map((l,i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-white text-[9px] font-black" style={{ borderColor: 'rgba(255,255,255,0.4)', background: ['#F97316','#1a6b3c','#0d9488','#d97706'][i] }}>{l}</div>
                  ))}
                  {customers.length > 4 && <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-black" style={{ borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.2)', color: 'white' }}>+{customers.length - 4}</div>}
                </div>
                <span className="text-orange-200/70 text-xs font-semibold">{customers.length} clientes activos</span>
              </div>
            )}
          </div>
          {!loading && customers.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  const rows = [['Nombre', 'Teléfono', 'Email', 'Tier', 'Puntos', 'Canjes', 'Última visita']];
                  for (const c of customers) {
                    rows.push([c.full_name, c.phone, c.email, c.tier, String(c.totalPoints), String(c.totalClaims), c.lastClaim.claimed_at.slice(0, 10)]);
                  }
                  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
                  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                  const a = document.createElement('a'); a.href = url; a.download = 'clientes.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all"
                style={{ background: 'white', color: '#059669', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Exportar CSV
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">

        {/* Stats row */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Clientes únicos', value: customers.length, icon: '', borderColor: '#F97316', bgColor: '#fde8e0', numColor: '#F97316' },
            { label: 'Frecuentes', value: segmentCounts.frecuentes, icon: '', borderColor: '#EA580C', bgColor: '#fef3c7', numColor: '#F97316' },
            { label: 'Sin canjear', value: segmentCounts.sin_canjear, icon: '⏳', borderColor: '#EA580C', bgColor: '#fef9c3', numColor: '#ea6a0a' },
            { label: 'Nuevos (30d)', value: segmentCounts.nuevos, icon: '', borderColor: '#8b5cf6', bgColor: '#ede9fe', numColor: '#1a6b3c' },
          ].map(({ label, value, icon, borderColor, bgColor, numColor }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-[#E8E3DC] border-l-4 p-5 flex items-center gap-4"
              style={{ borderLeftColor: borderColor, boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: bgColor }}>
                {icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-3xl font-extrabold" style={{ color: numColor }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Segment chips */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {SEGMENTS.map((seg) => (
            <SegmentButton
              key={seg.key}
              seg={seg}
              active={segment === seg.key}
              count={segmentCounts[seg.key]}
              onClick={() => setSegment(seg.key)}
            />
          ))}
        </div>

        {/* Search */}
        <div className="mb-5 flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre, correo o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all shadow-sm"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 bg-white transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <SkeletonTable rows={8} />
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
            {search || segment !== 'todos' ? (
              <EmptyState
                icon="search"
                title="Sin resultados para este filtro"
                description="Prueba con otro segmento o término de búsqueda."
                action={segment !== 'todos' ? { label: 'Ver todos los clientes', onClick: () => setSegment('todos') } : undefined}
              />
            ) : (
              <EmptyState
                icon="users"
                title="Sin clientes aún"
                description="Los clientes aparecerán aquí cuando canjeen su primer premio."
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                      Correo
                    </th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                      Nivel
                    </th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                      Canjes
                    </th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                      Última visita
                    </th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">
                      Historial
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((customer) => (
                    <CustomerRow key={customer.email} customer={customer} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3.5 bg-[#FAFAF9] border-t border-[#E8E3DC] flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Mostrando{' '}
                <span className="font-medium text-slate-600">{filtered.length}</span> de{' '}
                <span className="font-medium text-slate-600">{customers.length}</span> clientes
                {segment !== 'todos' && (
                  <span className="ml-2 text-[#F97316] font-bold">
                    · {SEGMENTS.find((s) => s.key === segment)?.label}
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
