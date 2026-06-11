'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Avatar } from '@/app/components/Avatar';
import { EmptyState } from '@/app/components/EmptyState';
import Tooltip from '@/app/components/Tooltip';
import RelativeDate from '@/app/components/RelativeDate';

type Claim = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  prize_name: string;
  prize_location: string;
  restaurant_name: string | null;
  location: string | null;
  claimed_at: string;
  status: 'pending' | 'delivered';
  delivered_at: string | null;
  delivered_by: string | null;
};

type Restaurant = { id: string; name: string };

type SortKey = 'full_name' | 'claimed_at' | 'status';
type SortDir = 'asc' | 'desc';

const BATCH_SIZE = 25;

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


function StatCard({
  label, value, color, icon,
}: {
  label: string;
  value: number | string;
  color: 'gray' | 'orange' | 'blue' | 'amber';
  icon: React.ReactNode;
}) {
  const colorMap = {
    gray:   { border: 'border-l-stone-400',  bg: 'bg-stone-100',  icon: 'text-stone-600',  num: 'text-stone-900'  },
    orange: { border: 'border-l-blue-500', bg: 'bg-blue-50', icon: 'text-blue-600', num: 'text-blue-600' },
    blue:   { border: 'border-l-blue-500',   bg: 'bg-blue-50',   icon: 'text-blue-600',   num: 'text-blue-600'   },
    amber:  { border: 'border-l-blue-500',  bg: 'bg-blue-50',  icon: 'text-blue-600',  num: 'text-blue-600'  },
  };
  const c = colorMap[color];
  return (
    <div className={`bg-white rounded-2xl border border-[#E8E3DC] border-l-4 ${c.border} shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] p-5 flex items-center gap-4 card-hover stagger-item`}>
      <div className={`w-[52px] h-[52px] rounded-full ${c.bg} flex items-center justify-center shrink-0`}>
        <span className={c.icon}>{icon}</span>
      </div>
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-3xl font-extrabold ${c.num}`}>{value}</p>
      </div>
    </div>
  );
}

function SortArrow({ direction }: { direction: SortDir }) {
  return (
    <svg className="w-3 h-3 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#2563EB' }}>
      {direction === 'asc' ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      )}
    </svg>
  );
}

function SkeletonLoading() {
  return (
    <div>
      {/* Skeleton stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-[#E8E3DC] p-5 flex items-center gap-4">
            <div className="skeleton-blue w-11 h-11 rounded-xl" />
            <div className="flex-1">
              <div className="skeleton-blue h-3 w-20 mb-2" />
              <div className="skeleton-blue h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
      {/* Skeleton search bar */}
      <div className="skeleton-blue h-10 w-full max-w-sm mb-5 rounded-xl" />
      {/* Skeleton table */}
      <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)]">
        <div className="p-4 border-b border-[#E8E3DC]">
          <div className="skeleton-blue h-4 w-48" />
        </div>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[#E8E3DC] last:border-0">
            <div className="skeleton-blue w-9 h-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="skeleton-blue h-4 w-32 mb-1.5" />
              <div className="skeleton-blue h-3 w-40" />
            </div>
            <div className="skeleton-blue h-6 w-20 rounded-full hidden sm:block" />
            <div className="skeleton-blue h-6 w-24 rounded-full hidden sm:block" />
            <div className="skeleton-blue h-3 w-28 hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 bg-white rounded-xl border border-[#E8E3DC] px-3 py-2.5 min-w-0">
      <span className="text-stone-400 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider leading-none mb-0.5">{label}</p>
        <p className="text-sm font-medium text-[#1C1917] break-all">{value}</p>
      </div>
    </div>
  );
}

function NoCobrosEmptyState() {
  const [howOpen, setHowOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] p-12 flex flex-col items-center text-center">
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="mb-6">
        {/* Clipboard body */}
        <rect x="22" y="18" width="76" height="62" rx="6" fill="#F5F0EA" stroke="#E8E3DC" strokeWidth="1.5" />
        {/* Clipboard clip */}
        <rect x="42" y="12" width="36" height="14" rx="5" fill="#E8E3DC" />
        <rect x="48" y="14" width="24" height="10" rx="3" fill="#D6CFC6" />
        {/* Lines on clipboard */}
        <rect x="34" y="36" width="52" height="4" rx="2" fill="#E8E3DC" />
        <rect x="34" y="46" width="40" height="4" rx="2" fill="#E8E3DC" />
        <rect x="34" y="56" width="44" height="4" rx="2" fill="#E8E3DC" />
      </svg>
      <p className="font-bold text-[#1C1917] text-base mb-2">Aún no hay cobros registrados</p>
      <p className="text-stone-400 text-sm max-w-xs leading-relaxed mb-5">
        Los cobros aparecen cuando un cliente escanea un QR, se registra, y el cajero confirma la entrega.
      </p>
      <button
        onClick={() => setHowOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#2563EB] bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {howOpen ? 'Ocultar explicacion' : '¿Cómo funciona?'}
        <svg
          className={`w-3.5 h-3.5 transition-transform ${howOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {howOpen && (
        <div className="w-full max-w-sm text-left space-y-3 mb-2 animate-in fade-in duration-200">
          {[
            { step: '1', title: 'Genera un premio QR', desc: 'El admin crea un código QR con el premio (bebida, descuento, etc.) y lo comparte o imprime.' },
            { step: '2', title: 'El cliente escanea y se registra', desc: 'El cliente escanea el QR con su celular, llena sus datos y obtiene su pase de cobro.' },
            { step: '3', title: 'El cajero confirma la entrega', desc: 'El cajero escanea el pase del cliente, verifica y presiona "Entregar". El cobro queda registrado aquí.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <div className="w-7 h-7 rounded-full bg-[#2563EB] text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                {step}
              </div>
              <div>
                <p className="font-bold text-sm text-[#1C1917]">{title}</p>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  try { return await fetch(url); }
  catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  }
}

export default function RegistrosPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState('');
  const [resending, setResending] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function handleResend(claimId: string) {
    setResending(claimId);
    try {
      const res = await fetch(`/api/claims/${claimId}/resend`, { method: 'POST' });
      if (res.ok) {
        setResendSuccess(claimId);
        setTimeout(() => setResendSuccess(null), 3000);
      }
    } catch {
      // silent
    } finally {
      setResending(null);
    }
  }
  const [search, setSearch] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered'>('all');

  const [restaurantFilter, setRestaurantFilter] = useState<string>('all');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>('claimed_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [compact, setCompact] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);

  const fetchBatch = useCallback(async (currentOffset: number, replace = false) => {
    if (currentOffset === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetchWithRetry(`/api/claims?offset=${currentOffset}&limit=${BATCH_SIZE}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const batch: Claim[] = data.claims ?? [];
      setClaims((prev) => replace ? batch : [...prev, ...batch]);
      setOffset(currentOffset + batch.length);
      setHasMore(batch.length === BATCH_SIZE);
    } catch {
      setError('No se pudieron cargar los registros.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchBatch(0, true);
  }, [fetchBatch]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchBatch(offset);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, offset, fetchBatch]);

  useEffect(() => {
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((data) => { if (data.restaurants) setRestaurants(data.restaurants); })
      .catch(() => {});
  }, []);

  const hasActiveFilters = dateFrom !== '' || dateTo !== '' || statusFilter !== 'all' || restaurantFilter !== 'all';

  function clearFilters() {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setRestaurantFilter('all');
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    let result = claims.filter((c) => {
      const q = search.toLowerCase();
      const matchesSearch =
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.prize_name.toLowerCase().includes(q) ||
        c.prize_location.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (restaurantFilter !== 'all' && (c.restaurant_name ?? '') !== restaurantFilter) return false;

      if (dateFrom) {
        const claimDate = new Date(c.claimed_at);
        const from = new Date(dateFrom + 'T00:00:00');
        if (claimDate < from) return false;
      }

      if (dateTo) {
        const claimDate = new Date(c.claimed_at);
        const to = new Date(dateTo + 'T23:59:59');
        if (claimDate > to) return false;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      let valA: string;
      let valB: string;

      if (sortKey === 'full_name') {
        valA = a.full_name.toLowerCase();
        valB = b.full_name.toLowerCase();
      } else if (sortKey === 'claimed_at') {
        valA = a.claimed_at;
        valB = b.claimed_at;
      } else {
        valA = a.status;
        valB = b.status;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [claims, search, dateFrom, dateTo, statusFilter, restaurantFilter, sortKey, sortDir]);

  const delivered = claims.filter((c) => c.status === 'delivered').length;
  const pending = claims.filter((c) => c.status === 'pending').length;
  const uniquePrizes = new Set(claims.map((c) => c.prize_name)).size;

  function exportPDF() {
    const dateRangeLabel = (() => {
      if (dateFrom && dateTo) return `${dateFrom} — ${dateTo}`;
      if (dateFrom) return `Desde ${dateFrom}`;
      if (dateTo) return `Hasta ${dateTo}`;
      return 'Todos los registros';
    })();

    const rows = filtered
      .map(
        (c) => `
        <tr>
          <td>${c.full_name}</td>
          <td>${c.phone}</td>
          <td>${c.email}</td>
          <td>${c.prize_name}</td>
          <td>${c.location ?? c.prize_location}</td>
          <td class="${c.status === 'delivered' ? 'status-delivered' : 'status-pending'}">${c.status === 'delivered' ? 'Entregado' : 'Pendiente'}</td>
          <td>${formatDate(c.claimed_at)}</td>
        </tr>`,
      )
      .join('');

    const printContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Reporte de Cobros — Super Tierra</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
    .report-header { padding: 24px 32px 16px; border-bottom: 3px solid #2563EB; display: flex; justify-content: space-between; align-items: flex-end; }
    .report-header .brand { display: flex; align-items: center; gap: 10px; }
    .report-header .brand-dot { width: 28px; height: 28px; border-radius: 50%; background: #2563EB; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-size: 14px; }
    .report-header .brand-name { font-size: 18px; font-weight: 900; color: #1e293b; letter-spacing: -0.5px; }
    .report-header .brand-sub { font-size: 11px; color: #2563EB; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }
    .report-header .meta { text-align: right; font-size: 10px; color: #64748b; line-height: 1.6; }
    .report-header .meta strong { color: #1e293b; }
    .summary { padding: 12px 32px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 32px; }
    .summary-item { display: flex; flex-direction: column; }
    .summary-item .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
    .summary-item .value { font-size: 20px; font-weight: 900; color: #1e293b; }
    .summary-item.delivered .value { color: #059669; }
    .summary-item.pending .value { color: #0EA5E9; }
    .table-wrap { padding: 20px 32px 0; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #1e293b; }
    thead th { padding: 8px 10px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr { border-bottom: 1px solid #e2e8f0; }
    tbody td { padding: 7px 10px; font-size: 10px; color: #334155; vertical-align: middle; }
    tbody td:first-child { font-weight: 700; color: #0f172a; }
    .status-delivered { color: #059669; font-weight: 700; }
    .status-pending { color: #0EA5E9; font-weight: 700; }
    .report-footer { margin: 20px 32px 0; padding: 14px 0; border-top: 2px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .report-footer .footer-brand { font-size: 11px; font-weight: 900; color: #2563EB; text-transform: uppercase; letter-spacing: 1px; }
    .report-footer .footer-note { font-size: 9px; color: #94a3b8; }
    @page { size: A4 landscape; margin: 0; }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="brand">
      <div class="brand-dot">P</div>
      <div>
        <div class="brand-name">Super Tierra</div>
        <div class="brand-sub">Reporte de Cobros</div>
      </div>
    </div>
    <div class="meta">
      <div><strong>Período:</strong> ${dateRangeLabel}</div>
      <div><strong>Generado:</strong> ${new Date().toLocaleString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      <div><strong>Registros:</strong> ${filtered.length} de ${claims.length}</div>
    </div>
  </div>
  <div class="summary">
    <div class="summary-item"><span class="label">Total</span><span class="value">${filtered.length}</span></div>
    <div class="summary-item delivered"><span class="label">Entregados</span><span class="value">${filtered.filter((c) => c.status === 'delivered').length}</span></div>
    <div class="summary-item pending"><span class="label">Pendientes</span><span class="value">${filtered.filter((c) => c.status === 'pending').length}</span></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Celular</th>
          <th>Correo</th>
          <th>Premio</th>
          <th>Lugar de Cobro</th>
          <th>Estado</th>
          <th>Fecha y Hora</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="report-footer">
    <span class="footer-brand">Burrito Bar</span>
    <span class="footer-note">Documento generado por el sistema Super Tierra &copy; ${new Date().getFullYear()}</span>
  </div>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
  }

  function exportCSV() {
    const headers = ['Nombre', 'Celular', 'Correo', 'Premio', 'Sucursal', 'Estado', 'Fecha'];
    const rows = filtered.map((c) => [
      c.full_name,
      c.phone,
      c.email,
      c.prize_name,
      c.location ?? c.prize_location,
      c.status === 'delivered' ? 'Entregado' : 'Pendiente',
      formatDate(c.claimed_at),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registros-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortableHeader = ({
    label,
    colKey,
    className = '',
  }: {
    label: string;
    colKey: SortKey;
    className?: string;
  }) => {
    const isActive = sortKey === colKey;
    return (
      <th
        className={`text-left px-5 py-3.5 font-bold text-xs uppercase tracking-wider cursor-pointer select-none transition-colors ${
          isActive ? 'text-[#2563EB]' : 'text-stone-500 hover:text-stone-700'
        } ${className}`}
        onClick={() => handleSort(colKey)}
      >
        {label}
        {isActive && <SortArrow direction={sortDir} />}
        {!isActive && (
          <svg className="w-3 h-3 inline-block ml-1 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        )}
      </th>
    );
  };

  return (
    <div className="min-h-screen admin-bg">
      {/* Thin orange gradient accent line at the very top */}
      <div style={{ height: '2px', width: '100%', background: 'linear-gradient(90deg, #2563EB, #0891B2, #38BDF8, #0891B2, #2563EB)' }} />
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 text-[#2563EB] rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 border border-blue-200 pulse-orange">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]" />
              </span>
              {loading ? 'Registros de Cobro' : `${claims.length} ${claims.length === 1 ? 'Registro' : 'Registros'}`}
            </div>
            <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight border-l-4 border-[#2563EB] pl-4">
              Registros de <span className="gradient-text">Cobro</span>
            </h1>
            <p className="text-stone-500 mt-2 text-sm pl-4">Historial de todas las personas que han reclamado premios.</p>
          </div>
        </div>

        {loading ? <SkeletonLoading /> : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Total cobros"
                value={claims.length}
                color="gray"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Entregados"
                value={delivered}
                color="orange"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Pendientes"
                value={pending}
                color="amber"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="Premios distintos"
                value={uniquePrizes}
                color="blue"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                }
              />
            </div>

            {/* Search row */}
            <div className="mb-3 flex items-center gap-3">
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo, premio o lugar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="hidden sm:inline-flex text-xs text-stone-400 hover:text-stone-700 border border-[#E8E3DC] rounded-lg px-3 py-2.5 bg-white transition-colors"
                >
                  Limpiar
                </button>
              )}

              {/* Desktop: inline action buttons */}
              <div className="hidden sm:flex items-center gap-3">
                <button onClick={() => setCompact(c => !c)} className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 border border-[#E8E3DC] bg-white px-3 py-2.5 rounded-xl transition-colors hover:bg-[#FAFAF9]">
                  {compact ? '⊞ Normal' : '⊡ Compacto'}
                </button>
                <button
                  onClick={exportCSV}
                  disabled={filtered.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exportar CSV
                </button>
                <button
                  onClick={exportPDF}
                  disabled={filtered.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-stone-600 bg-white hover:bg-stone-50 hover:text-stone-700 border border-stone-300 hover:border-stone-400 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Exportar PDF
                </button>
              </div>

              {/* Mobile: actions dropdown */}
              <div className="relative sm:hidden">
                <button
                  onClick={() => setActionsMenuOpen(o => !o)}
                  className="flex items-center gap-1 text-xs font-semibold text-stone-600 border border-[#E8E3DC] bg-white px-3 py-2.5 rounded-xl transition-colors hover:bg-[#FAFAF9]"
                  aria-label="Acciones"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {actionsMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setActionsMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E8E3DC] rounded-xl shadow-lg z-40 overflow-hidden py-1">
                      <button
                        onClick={() => { setCompact(c => !c); setActionsMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#FAFAF9] transition-colors"
                      >
                        <span className="text-base leading-none">{compact ? '⊞' : '⊡'}</span>
                        {compact ? 'Vista normal' : 'Vista compacta'}
                      </button>
                      <div className="h-px bg-[#E8E3DC] mx-3 my-1" />
                      <button
                        onClick={() => { exportCSV(); setActionsMenuOpen(false); }}
                        disabled={filtered.length === 0}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Exportar CSV
                      </button>
                      <button
                        onClick={() => { exportPDF(); setActionsMenuOpen(false); }}
                        disabled={filtered.length === 0}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-[#FAFAF9] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Exportar PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Filter bar */}
            <div
              className="mb-5 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 bg-white border rounded-xl px-4 py-3 shadow-sm"
              style={{ borderColor: hasActiveFilters ? '#2563EB' : '#E8E3DC' }}
            >
              {/* Date range: stacked on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide whitespace-nowrap w-12 sm:w-auto">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="flex-1 sm:flex-none text-sm border border-[#E8E3DC] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    style={dateFrom ? { borderColor: '#2563EB', boxShadow: '0 0 0 2px #2563EB22' } : {}}
                  />
                </div>
                <div className="hidden sm:block text-stone-300 text-sm">—</div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wide whitespace-nowrap w-12 sm:w-auto">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="flex-1 sm:flex-none text-sm border border-[#E8E3DC] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    style={dateTo ? { borderColor: '#2563EB', boxShadow: '0 0 0 2px #2563EB22' } : {}}
                  />
                </div>
              </div>

              <div className="w-px h-6 bg-stone-200 mx-1 hidden sm:block" />

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wide whitespace-nowrap">Estado</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'delivered')}
                  className="flex-1 sm:flex-none text-sm border border-[#E8E3DC] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  style={statusFilter !== 'all' ? { borderColor: '#2563EB', boxShadow: '0 0 0 2px #2563EB22', color: '#2563EB', fontWeight: 700 } : {}}
                >
                  <option value="all">Todos</option>
                  <option value="pending">Pendientes</option>
                  <option value="delivered">Entregados</option>
                </select>
              </div>

              {restaurants.length > 0 && (
                <>
                  <div className="w-px h-6 bg-stone-200 mx-1 hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wide whitespace-nowrap">Sucursal</label>
                    <select
                      value={restaurantFilter}
                      onChange={(e) => setRestaurantFilter(e.target.value)}
                      className="flex-1 sm:flex-none text-sm border border-[#E8E3DC] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      style={restaurantFilter !== 'all' ? { borderColor: '#2563EB', boxShadow: '0 0 0 2px #2563EB22', color: '#2563EB', fontWeight: 700 } : {}}
                    >
                      <option value="all">Todas las sucursales</option>
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="sm:ml-auto inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
                  style={{ color: '#2563EB', borderColor: '#2563EB', background: '#fff7f5' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpiar filtros
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {filtered.length === 0 ? (
              (search || hasActiveFilters) ? (
              <EmptyState
                type="no-results"
                title="Sin resultados para los filtros aplicados"
                subtitle="Prueba ajustando los filtros o la búsqueda para encontrar lo que buscas."
                action={
                    <button
                      onClick={() => { setSearch(''); clearFilters(); }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Limpiar todos los filtros
                    </button>
                }
              />
              ) : (
                <NoCobrosEmptyState />
              )
            ) : (
              <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] overflow-hidden">
                {/* Mobile card list (sm:hidden) */}
                <div className="sm:hidden divide-y divide-[#F0EDE8]">
                  {filtered.map((claim) => (
                    <div key={claim.id} className="flex gap-0 hover:bg-[#faf7f5] transition-colors stagger-item min-h-[64px]">
                      {/* Orange left accent bar */}
                      <div className={`w-1.5 shrink-0 rounded-none ${claim.status === 'delivered' ? 'bg-blue-400' : 'bg-blue-400'}`} />
                      <div className="flex-1 p-4 flex flex-col gap-2.5 min-w-0">
                        {/* Top row: avatar + name + status */}
                        <div className="flex items-start gap-3">
                          <Avatar name={claim.full_name} />
                          <div className="flex-1 min-w-0">
                            <a href={`/admin/cliente/${encodeURIComponent(claim.phone)}`} className="font-bold text-stone-900 text-sm leading-tight truncate block hover:text-[#2563EB] transition-colors">{claim.full_name}</a>
                            <a href={`tel:${claim.phone}`} className="text-xs text-stone-400 font-mono mt-0.5 block">{claim.phone}</a>
                          </div>
                          {claim.status === 'delivered' ? (
                            <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                              <span className="status-dot-active" />Entregado
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                              <span className="status-dot-pending" />Pendiente
                            </span>
                          )}
                        </div>
                        {/* Prize badge */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-200">
                            {claim.prize_name}
                          </span>
                        </div>
                        {/* Footer row: location + date */}
                        <div className="flex items-center justify-between text-xs text-stone-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 shrink-0 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="truncate max-w-[120px]">{claim.location ?? claim.prize_location}</span>
                          </span>
                          <span className="text-stone-300"><RelativeDate dateStr={claim.claimed_at} /></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table (hidden sm:block) */}
                <div className="hidden sm:block overflow-x-auto">
                  <div className="max-h-[640px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                          <SortableHeader label="Persona" colKey="full_name" />
                          <th className="text-left px-5 py-3.5 font-bold text-stone-500 text-xs uppercase tracking-wider">Premio</th>
                          <SortableHeader label="Estado" colKey="status" />
                          <SortableHeader label="Fecha" colKey="claimed_at" />
                          <th className="text-left px-5 py-3.5 font-bold text-stone-500 text-xs uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8E3DC]">
                        {filtered.map((claim) => {
                          const isExpanded = expandedId === claim.id;
                          return (
                            <>
                              <tr
                                key={claim.id}
                                className="hover:bg-[#faf7f5] transition-colors group stagger-item cursor-pointer"
                                onClick={() => toggleExpand(claim.id)}
                              >
                                <td className={`${compact ? 'py-2' : 'py-4'} pl-0 pr-5`}>
                                  <div className="flex items-center">
                                    {/* Orange left border on hover */}
                                    <div className="w-[3px] self-stretch min-h-[44px] rounded-r bg-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity mr-4" />
                                    <div className="flex items-center gap-3">
                                      <Avatar name={claim.full_name} size={compact ? 28 : 36} />
                                      <div>
                                        <a
                                          href={`/admin/cliente/${encodeURIComponent(claim.phone)}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="font-semibold text-sm text-[#1C1917] group-hover:text-[#2563EB] transition-colors leading-tight hover:underline"
                                        >{claim.full_name}</a>
                                        <p className="text-xs text-stone-400 mt-0.5 font-mono">{claim.phone}</p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className={`px-5 ${compact ? 'py-2' : 'py-4'}`}>
                                  <span className="inline-flex items-center bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-200">
                                    {claim.prize_name}
                                  </span>
                                </td>
                                <td className={`px-5 ${compact ? 'py-2' : 'py-4'}`}>
                                  {claim.status === 'delivered' ? (
                                    <span className="inline-flex items-center text-xs font-bold text-[#15803d]">
                                      <span className="status-dot-active" />Entregado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-xs font-bold text-[#1D4ED8]">
                                      <span className="status-dot-pending" />Pendiente
                                    </span>
                                  )}
                                </td>
                                <td className={`px-5 ${compact ? 'py-2' : 'py-4'} text-xs text-stone-400 whitespace-nowrap`}>
                                  <RelativeDate dateStr={claim.claimed_at} />
                                </td>
                                <td className={`px-5 ${compact ? 'py-2' : 'py-4'}`}>
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    {/* Ver detalles toggle */}
                                    <button
                                      onClick={() => toggleExpand(claim.id)}
                                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                    >
                                      Ver detalles
                                      <svg
                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </button>
                                    {/* Resend button */}
                                    {resendSuccess === claim.id ? (
                                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Enviado
                                      </span>
                                    ) : (
                                      <Tooltip text="Reenviar QR al correo del cliente">
                                        <button
                                          onClick={() => handleResend(claim.id)}
                                          disabled={resending === claim.id}
                                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                          {resending === claim.id ? (
                                            <div className="spinner-brand spinner-sm" />
                                          ) : (
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                          )}
                                          Reenviar QR
                                        </button>
                                      </Tooltip>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Expandable detail row */}
                              {isExpanded && (
                                <tr key={`${claim.id}-detail`}>
                                  <td colSpan={5} className="px-6 py-4 bg-blue-50/30">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      <InfoChip
                                        icon={
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                          </svg>
                                        }
                                        label="Correo"
                                        value={claim.email}
                                      />
                                      <InfoChip
                                        icon={
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                        }
                                        label="Lugar elegido"
                                        value={claim.location ?? claim.prize_location}
                                      />
                                      <InfoChip
                                        icon={
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                          </svg>
                                        }
                                        label="Descripción premio"
                                        value={claim.prize_name}
                                      />
                                      {claim.status === 'delivered' && claim.delivered_by ? (
                                        <InfoChip
                                          icon={
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                          }
                                          label={claim.delivered_at ? `Entregado · ${formatDate(claim.delivered_at)}` : 'Entregado por'}
                                          value={claim.delivered_by}
                                        />
                                      ) : (
                                        <InfoChip
                                          icon={
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                          }
                                          label="Estado entrega"
                                          value="Pendiente de entregar"
                                        />
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer: count info */}
                <div className="px-5 py-3 bg-[#FAFAF9] border-t border-[#E8E3DC] flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-stone-500">
                    {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'} cargados
                    {hasActiveFilters && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ml-2"
                        style={{ color: '#2563EB', borderColor: '#2563EB', background: '#fff7f5' }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        Filtros activos
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />

            {/* Loading more spinner */}
            {loadingMore && (
              <div className="flex items-center justify-center py-6 gap-3 text-stone-400">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Cargando mas registros…</span>
              </div>
            )}

            {/* End of records */}
            {!hasMore && !loading && claims.length > 0 && (
              <div className="flex items-center justify-center py-6">
                <span className="text-xs text-stone-400 border border-[#E8E3DC] rounded-full px-4 py-1.5">
                  Fin de registros
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
