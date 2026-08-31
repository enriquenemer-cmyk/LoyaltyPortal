'use client';
import { GiftIcon } from '@heroicons/react/24/outline';

import { Fragment, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EmptyState } from '@/app/components/EmptyState';
import Tooltip from '@/app/components/Tooltip';
import RelativeDate from '@/app/components/RelativeDate';
import { useToast } from '@/app/components/Toast';

type Prize = {
  id: string;
  name: string;
  reason: string;
  description: string;
  start_date: string;
  end_date: string;
  restaurant_id: string | null;
  restaurant_name: string | null;
  cancelled: boolean;
  claim_count: number;
  created_at: string;
  generated_by?: string | null;
  max_uses?: number;
};

type Restaurant = { id: string; name: string };

type StatusInfo = { label: string; bg: string; text: string; dotColor: string; animate: boolean };

type StatusFilter = 'todos' | 'activos' | 'canjeados' | 'expirados' | 'cancelados';

const PAGE_SIZE = 20;

function getPrizeStatus(p: Prize): StatusInfo {
  if (p.cancelled) return { label: 'Cancelado', bg: 'bg-red-50', text: 'text-red-700', dotColor: 'bg-red-500', animate: false };
  if (p.claim_count > 0) return { label: 'Canjeado', bg: 'bg-orange-50', text: 'text-orange-700', dotColor: 'bg-orange-500', animate: false };
  const today = new Date().toISOString().split('T')[0];
  if (today > p.end_date) return { label: 'Expirado', bg: 'bg-stone-100', text: 'text-stone-500', dotColor: 'bg-stone-400', animate: false };
  return { label: 'Activo', bg: 'bg-green-50', text: 'text-green-700', dotColor: 'bg-green-500', animate: true };
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDatetime(d: string) {
  return new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusPill({ status }: { status: StatusInfo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${status.bg} ${status.text} border-current/20`}>
      <span className="relative flex h-2 w-2">
        {status.animate && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${status.dotColor} opacity-60`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${status.dotColor}`} />
      </span>
      {status.label}
    </span>
  );
}

function QRModal({ prize, onClose }: { prize: Prize; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/premio/${prize.id}`
    : `/premio/${prize.id}`;

  useEffect(() => {
    import('qrcode').then((QR) => {
      QR.toDataURL(url, { width: 280, color: { dark: '#1c0a00', light: '#ffffff' } }).then(setQrDataUrl);
    });
  }, [url]);

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${prize.id}.png`;
    a.click();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(` *${prize.name}*\n\nCanjea tu premio aquí: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function handlePrint() {
    if (!qrDataUrl) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>QR - ${prize.name}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff;">
          <h2 style="color:#1c0a00;margin-bottom:8px;">${prize.name}</h2>
          <img src="${qrDataUrl}" width="280" height="280" style="display:block;" />
          <p style="color:#555;font-size:12px;margin-top:12px;word-break:break-all;max-width:300px;text-align:center;">${url}</p>
          <script>window.onload=function(){window.print();window.close();}</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-[#E8E3DC] pop-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-500 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-orange-100 uppercase tracking-widest mb-0.5">Ver QR</p>
            <h2 className="text-white font-extrabold text-base leading-tight truncate max-w-[220px]">{prize.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center gap-4">
          {qrDataUrl ? (
            <div className="rounded-xl border border-[#E8E3DC] shadow-inner bg-white p-2">
              <img ref={imgRef} src={qrDataUrl} alt="QR Code" width={280} height={280} className="block" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-[280px] h-[280px] rounded-xl border border-[#E8E3DC] bg-stone-50">
              <svg className="animate-spin w-8 h-8 text-[#1a6b3c]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}

          {/* URL text */}
          <p className="text-xs text-stone-400 break-all text-center max-w-[280px] leading-relaxed">{url}</p>

          {/* Actions */}
          <div className="flex gap-3 w-full flex-wrap">
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex-1 flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar
            </button>
            <button
              onClick={handlePrint}
              disabled={!qrDataUrl}
              className="flex-1 flex items-center justify-center gap-2 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-[#E8E3DC] font-bold text-sm px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
          </div>
          {/* WhatsApp share button */}
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-2.5 rounded-xl transition-colors text-white"
            style={{ background: '#25D366' }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Compartir por WhatsApp
          </button>

          {/* Copy link button */}
          <button
            onClick={handleCopyLink}
            className={`w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-2.5 rounded-xl transition-all ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-[#E8E3DC]'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                ✓ Copiado!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copiar enlace
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpandedDetail({ prize }: { prize: Prize }) {
  const status = getPrizeStatus(prize);
  return (
    <tr>
      <td colSpan={8} className="px-0 py-0">
        <div className="bg-orange-50/20 border-t border-[#E8E3DC] px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Creado</p>
              <p className="text-xs text-[#1C1917] font-medium"><RelativeDate dateStr={prize.created_at} /></p>
              {prize.generated_by && (
                <p className="text-[10px] text-stone-400 mt-0.5">por {prize.generated_by}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Restaurante</p>
              <p className="text-xs text-[#1C1917] font-medium">{prize.restaurant_name || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Razón</p>
              <p className="text-xs text-[#1C1917] font-medium">{prize.reason || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Descripción</p>
              <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{prize.description || '—'}</p>
            </div>
          </div>

          {/* Mini timeline */}
          <div className="mt-4 pt-4 border-t border-[#E8E3DC]/60">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-3">Historial</p>
            <div className="flex flex-col gap-2">
              {/* Generado */}
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <span className="text-xs font-semibold text-[#1C1917]">Generado</span>
                  <span className="text-xs text-stone-400 ml-2"><RelativeDate dateStr={prize.created_at} /></span>
                  {prize.generated_by && (
                    <span className="text-xs text-stone-400 ml-1">por {prize.generated_by}</span>
                  )}
                </div>
              </div>

              {/* Canjeado */}
              {prize.claim_count > 0 && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-[#1C1917]">Canjeado</span>
                    <span className="text-xs text-stone-400 ml-2">{prize.claim_count} {prize.claim_count === 1 ? 'vez' : 'veces'}</span>
                  </div>
                </div>
              )}

              {/* Expirado */}
              {status.label === 'Expirado' && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-stone-400" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-stone-500">Expirado</span>
                    <span className="text-xs text-stone-400 ml-2">{formatDate(prize.end_date)}</span>
                  </div>
                </div>
              )}

              {/* Cancelado */}
              {prize.cancelled && (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-red-600">Cancelado</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'activos', label: 'Activos' },
  { key: 'canjeados', label: 'Canjeados' },
  { key: 'expirados', label: 'Expirados' },
  { key: 'cancelados', label: 'Cancelados' },
];

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  }
  catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  }
}

export default function PremiosPage() {
  const router = useRouter();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [restaurantFilter, setRestaurantFilter] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [pendingCancelIds, setPendingCancelIds] = useState<Set<string>>(new Set());
  const [qrPrize, setQrPrize] = useState<Prize | null>(null);
  const [expandedPrizeId, setExpandedPrizeId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [page, setPage] = useState(1);
  const toast = useToast();

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [bulkCancelling, setBulkCancelling] = useState(false);

  async function fetchPrizes() {
    setLoading(true);
    try {
      const res = await fetchWithRetry('/api/prizes/list');
      const data = await res.json();
      if (data.prizes) setPrizes(data.prizes);
    } catch {
      toast.error('No se pudieron cargar los premios. Intenta recargar la página.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrizes();
    fetch('/api/restaurants').then(r => r.json()).then(d => {
      if (d.restaurants) setRestaurants(d.restaurants);
    }).catch(() => {});
  }, []);

  const today = new Date().toISOString().split('T')[0];

  function matchesStatusFilter(p: Prize): boolean {
    if (statusFilter === 'todos') return true;
    if (statusFilter === 'activos') return !p.cancelled && p.claim_count === 0 && today <= p.end_date;
    if (statusFilter === 'canjeados') return p.claim_count > 0;
    if (statusFilter === 'expirados') return !p.cancelled && p.claim_count === 0 && today > p.end_date;
    if (statusFilter === 'cancelados') return p.cancelled;
    return true;
  }

  // Keep selectAll in sync when filtered set changes
  const filtered = prizes.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || (p.restaurant_name || '').toLowerCase().includes(q);
    const matchesRestaurant = !restaurantFilter || (p.restaurant_name ?? '') === restaurantFilter;
    return matchesSearch && matchesRestaurant && matchesStatusFilter(p);
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (filtered.length === 0) { setSelectAll(false); return; }
    const allSelected = filtered.every((p) => selectedIds.has(p.id));
    setSelectAll(allSelected);
  }, [selectedIds, filtered.length]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleToggleSelectAll() {
    if (selectAll) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  function handleToggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
    setSelectAll(false);
  }

  function handleExportCSV() {
    const selected = prizes.filter((p) => selectedIds.has(p.id));
    const header = ['ID', 'Nombre', 'Razón', 'Descripción', 'Restaurante', 'Inicio', 'Fin', 'Estado', 'Cobros', 'Creado'];
    const rows = selected.map((p) => {
      const status = getPrizeStatus(p);
      return [
        p.id,
        p.name,
        p.reason,
        p.description,
        p.restaurant_name ?? '',
        p.start_date,
        p.end_date,
        status.label,
        String(p.claim_count),
        p.created_at,
      ].map((v) => `"${v.replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `premios-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBulkCancel() {
    const cancellable = prizes.filter((p) => selectedIds.has(p.id) && !p.cancelled && p.claim_count === 0);
    if (cancellable.length === 0) {
      alert('Ninguno de los premios seleccionados puede ser cancelado (ya están cancelados o han sido canjeados).');
      return;
    }
    if (!confirm(`¿Cancelar ${cancellable.length} premio${cancellable.length !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return;
    setBulkCancelling(true);
    const cancelIds = cancellable.map((p) => p.id);
    // Optimistic: mark all as cancelled immediately
    setPrizes((prev) => prev.map((p) => cancelIds.includes(p.id) ? { ...p, cancelled: true } : p));
    setPendingCancelIds((prev) => { const next = new Set(prev); cancelIds.forEach((id) => next.add(id)); return next; });
    try {
      const results = await Promise.allSettled(
        cancellable.map((p) => fetch(`/api/prizes/${p.id}/cancel`, { method: 'POST' }).then((r) => ({ id: p.id, ok: r.ok })))
      );
      const failed = results
        .filter((r): r is PromiseFulfilledResult<{ id: string; ok: boolean }> => r.status === 'fulfilled' && !r.value.ok)
        .map((r) => r.value.id);
      if (failed.length > 0) {
        setPrizes((prev) => prev.map((p) => failed.includes(p.id) ? { ...p, cancelled: false } : p));
        toast.error(`${failed.length} premio(s) no se pudieron cancelar.`);
      }
    } catch {
      setPrizes((prev) => prev.map((p) => cancelIds.includes(p.id) ? { ...p, cancelled: false } : p));
      toast.error('Error al cancelar los premios.');
    } finally {
      setPendingCancelIds((prev) => { const next = new Set(prev); cancelIds.forEach((id) => next.delete(id)); return next; });
    }
    setSelectedIds(new Set());
    setBulkCancelling(false);
  }

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm('¿Cancelar este premio? Esta acción no se puede deshacer.')) return;
    setCancelling(id);
    // Optimistic update
    setPrizes((prev) => prev.map((p) => p.id === id ? { ...p, cancelled: true } : p));
    setPendingCancelIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    try {
      const res = await fetch(`/api/prizes/${id}/cancel`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
    } catch {
      // Revert
      setPrizes((prev) => prev.map((p) => p.id === id ? { ...p, cancelled: false } : p));
      toast.error('No se pudo cancelar el premio. Inténtalo de nuevo.');
    } finally {
      setPendingCancelIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setCancelling(null);
    }
  }, [toast]);

  function handleDuplicate(p: Prize) {
    const params = new URLSearchParams({
      name: p.name,
      reason: p.reason,
      description: p.description,
      ...(p.restaurant_id ? { restaurant_id: p.restaurant_id } : {}),
    });
    router.push(`/admin/generate?${params.toString()}`);
  }

  function handleToggleExpand(id: string, e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;
    setExpandedPrizeId((prev) => (prev === id ? null : id));
  }

  const total = prizes.length;
  const activos = prizes.filter((p) => !p.cancelled && p.claim_count === 0 && today <= p.end_date).length;
  const canjeados = prizes.filter((p) => p.claim_count > 0).length;
  const expirados = prizes.filter((p) => !p.cancelled && p.claim_count === 0 && today > p.end_date).length;
  const cancelados = prizes.filter((p) => p.cancelled).length;

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  return (
    <div className="min-h-screen">
      {qrPrize && <QRModal prize={qrPrize} onClose={() => setQrPrize(null)} />}

      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <GiftIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Premios QR
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Mis Premios</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Historial completo de premios generados</p>
          </div>
          <Link
            href="/admin/generate"
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all"
            style={{ background: 'white', color: '#111111', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Premio
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">

        {/* Stats bar */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
          {[
            { label: 'Total', value: total, border: 'border-l-stone-400', num: 'text-[#1C1917]', bg: 'bg-stone-50', dot: '#78716c' },
            { label: 'Activos', value: activos, border: 'border-l-emerald-500', num: 'text-emerald-600', bg: 'bg-emerald-50', dot: '#059669' },
            { label: 'Canjeados', value: canjeados, border: 'border-l-orange-500', num: 'text-orange-600', bg: 'bg-orange-50', dot: '#F97316' },
            { label: 'Expirados', value: expirados, border: 'border-l-stone-300', num: 'text-stone-500', bg: 'bg-stone-50', dot: '#a8a29e' },
            { label: 'Cancelados', value: cancelados, border: 'border-l-red-400', num: 'text-red-500', bg: 'bg-red-50', dot: '#ef4444' },
          ].map(({ label, value, border, num, bg, dot }) => (
            <div key={label} className={`${bg} rounded-2xl border border-[#E8E3DC] border-l-4 ${border} shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] px-5 py-4 flex-shrink-0 min-w-[120px]`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: dot }} />
                <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">{label}</p>
              </div>
              <p className={`text-3xl font-black ${num} leading-none`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Status filter tabs */}
        <div className="mb-5 flex items-center gap-1.5 flex-wrap">
          {STATUS_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(key); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                statusFilter === key
                  ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                  : 'bg-stone-50 text-stone-600 border-[#E8E3DC] hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search + filter */}
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o restaurante..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E8E3DC] rounded-xl text-sm text-[#1C1917] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all shadow-sm"
            />
          </div>
          {restaurants.length > 0 && (
            <select
              value={restaurantFilter}
              onChange={(e) => { setRestaurantFilter(e.target.value); setPage(1); }}
              className="text-sm border border-[#E8E3DC] rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all shadow-sm"
              style={restaurantFilter ? { borderColor: '#F97316', color: '#F97316', fontWeight: 700 } : {}}
            >
              <option value="">Todos los restaurantes</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-20 flex flex-col items-center gap-3">
            <div className="spinner-brand spinner-lg" />
            <p className="text-stone-400 text-sm">Cargando premios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            type={search || restaurantFilter || statusFilter !== 'todos' ? 'no-results' : 'no-prizes'}
            title={search || restaurantFilter || statusFilter !== 'todos' ? 'Sin premios que coincidan' : 'Aún no has generado ningún premio'}
            subtitle={
              search || restaurantFilter || statusFilter !== 'todos'
                ? 'Prueba ajustando la búsqueda o los filtros.'
                : 'Los premios son códigos QR únicos que puedes imprimir, enviar por WhatsApp o mostrar en tu restaurante.'
            }
            action={
              !search && !restaurantFilter && statusFilter === 'todos' ? (
                <Link
                  href="/admin/generate"
                  className="inline-flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)', boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Generar mi primer premio
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="relative bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                    {/* Checkbox header */}
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded border-stone-300 cursor-pointer"
                        style={{ accentColor: '#F97316' }}
                        aria-label="Seleccionar todos"
                      />
                    </th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Restaurante</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Razón</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Inicio</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Fin</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3.5 font-bold text-stone-400 text-xs uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE4]">
                  {paginated.map((p) => {
                    const status = getPrizeStatus(p);
                    const canCancel = !p.cancelled && p.claim_count === 0;
                    const isSelected = selectedIds.has(p.id);
                    const isExpanded = expandedPrizeId === p.id;
                    return (
                      <Fragment key={p.id}>
                        <tr
                          className={`hover:bg-[#faf7f5] transition-colors cursor-pointer ${isSelected ? 'bg-orange-50/60' : ''} ${isExpanded ? 'bg-orange-50/30' : ''}`}
                          onClick={(e) => handleToggleExpand(p.id, e)}
                        >
                          <td className="px-4 py-4 w-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRow(p.id)}
                              className="w-4 h-4 rounded border-stone-300 cursor-pointer"
                              style={{ accentColor: '#F97316' }}
                              aria-label={`Seleccionar ${p.name}`}
                            />
                          </td>
                          <td className="px-5 py-4 max-w-[200px]">
                            <div className="flex items-center gap-1.5">
                              <svg
                                className={`w-3.5 h-3.5 text-stone-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-medium text-[#1C1917] truncate block">{p.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1 pl-5">
                              {p.restaurant_name && (
                                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">{p.restaurant_name}</span>
                              )}
                              {p.generated_by && (
                                <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">por {p.generated_by}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-stone-500 text-xs">{p.restaurant_name || '—'}</td>
                          <td className="px-5 py-4 text-stone-500 text-xs max-w-[160px] truncate">{p.reason}</td>
                          <td className="px-5 py-4 text-stone-400 text-xs whitespace-nowrap">{formatDate(p.start_date)}</td>
                          <td className="px-5 py-4 text-stone-400 text-xs whitespace-nowrap">{formatDate(p.end_date)}</td>
                          <td className="px-5 py-4">
                            <StatusPill status={status} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              {/* Ver QR */}
                              <button
                                onClick={() => setQrPrize(p)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4h.01M8 8h.01M16 8h.01M4 12h.01M20 12h.01M8 16h.01M16 16h.01M12 20h.01M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z" />
                                </svg>
                                Ver QR
                              </button>
                              {/* Duplicar */}
                              <Tooltip text="Duplicar premio">
                                <button
                                  onClick={() => handleDuplicate(p)}
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 border border-[#E8E3DC] bg-stone-50 hover:bg-stone-100 px-2.5 py-1.5 rounded-lg transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  Duplicar
                                </button>
                              </Tooltip>
                              {/* Cancelar individual */}
                              {canCancel && (
                                <Tooltip text="Cancelar premio">
                                  <button
                                    onClick={() => handleCancel(p.id)}
                                    disabled={cancelling === p.id || pendingCancelIds.has(p.id)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                                  >
                                    {(cancelling === p.id || pendingCancelIds.has(p.id)) ? (
                                      <>
                                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Guardando...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Cancelar
                                      </>
                                    )}
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && <ExpandedDetail prize={p} />}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
                </span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border disabled:opacity-40 hover:bg-slate-50 transition-colors">
                    ← Anterior
                  </button>
                  {Array.from({ length: Math.ceil(filtered.length / PAGE_SIZE) }, (_, i) => i + 1)
                    .filter(p => Math.abs(p - page) <= 1)
                    .map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg border transition-colors ${p === page ? 'bg-orange-500 text-white border-orange-500' : 'hover:bg-slate-50'}`}>
                        {p}
                      </button>
                    ))}
                  <button disabled={page >= Math.ceil(filtered.length / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border disabled:opacity-40 hover:bg-slate-50 transition-colors">
                    Siguiente →
                  </button>
                </div>
              </div>
            )}

            {/* Sticky bulk action bar */}
            {hasSelection && (
              <div className="sticky bottom-0 left-0 right-0 border-t border-[#E8E3DC] bg-white/95 backdrop-blur-sm px-5 py-3 flex items-center gap-3 flex-wrap shadow-[0_-4px_16px_rgba(28,25,23,0.08)]">
                <span className="text-sm font-bold text-[#1C1917] mr-1">
                  {selectedCount} {selectedCount === 1 ? 'premio seleccionado' : 'premios seleccionados'}
                </span>

                <button
                  onClick={handleClearSelection}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 border border-[#E8E3DC] bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar selección
                </button>

                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-700 border border-[#E8E3DC] bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Exportar CSV
                </button>

                <button
                  onClick={handleBulkCancel}
                  disabled={bulkCancelling}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ml-auto"
                >
                  {bulkCancelling ? (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  )}
                  Cancelar todos
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
