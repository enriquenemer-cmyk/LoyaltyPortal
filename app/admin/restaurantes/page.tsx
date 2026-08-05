'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EmptyState as SharedEmptyState } from '@/app/components/EmptyState';

type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  accent_color: string;
  created_at: string;
  prize_count?: number;
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const SWATCHES = ['#2563EB', '#7c3aed', '#0ea5e9', '#be185d', '#059669', '#0EA5E9'];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      {SWATCHES.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            title={color}
            className="relative w-9 h-9 rounded-full transition-all duration-150 focus:outline-none"
            style={{
              backgroundColor: color,
              boxShadow: selected
                ? `0 0 0 2px #fff, 0 0 0 4px ${color}`
                : `0 2px 6px ${color}55`,
              transform: selected ? 'scale(1.18)' : 'scale(1)',
            }}
          >
            {selected && (
              <svg
                className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        );
      })}

      {/* Custom color input */}
      <label
        className="relative w-9 h-9 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors overflow-hidden"
        title="Personalizado"
        style={
          !SWATCHES.includes(value.toLowerCase()) && !SWATCHES.includes(value)
            ? { borderColor: value, backgroundColor: value + '22' }
            : {}
        }
      >
        {!SWATCHES.map((s) => s.toLowerCase()).includes(value.toLowerCase()) ? (
          <svg
            className="absolute inset-0 m-auto w-4 h-4 drop-shadow"
            fill="none"
            stroke={value}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        )}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          title="Personalizado"
        />
      </label>

      <span className="text-xs font-mono text-gray-400 tracking-wide">{value}</span>
    </div>
  );
}

function QRLinkModal({ restaurant, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const qrUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/cajero/escanear?r=${encodeURIComponent(restaurant.name)}`
    : '';

  useEffect(() => {
    if (!qrUrl) return;
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(qrUrl, { width: 256, margin: 2 }).then(setQrDataUrl);
    });
  }, [qrUrl]);

  function handleCopyUrl() {
    navigator.clipboard.writeText(qrUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${restaurant.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', padding: '20px 22px' }} className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">QR de Cajero</p>
            <h3 className="text-white font-extrabold text-base leading-tight">{restaurant.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR */}
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="bg-orange-100 rounded-xl p-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR Code" width={200} height={200} className="rounded-lg" />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center">
                <svg className="animate-spin w-8 h-8 text-[#1a6b3c]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            )}
          </div>

          {/* URL */}
          <div className="w-full bg-gray-50 border border-[#E8E3DC] rounded-xl px-3 py-2">
            <p className="text-gray-500 text-[11px] truncate" style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
              {qrUrl}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 w-full">
            <button
              onClick={handleCopyUrl}
              className="flex-1 flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-sm border border-[#E8E3DC] hover:bg-gray-50 transition-all"
              style={{ color: copied ? '#16a34a' : '#374151' }}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  ✓ Copiado
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar URL
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex-1 flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-sm text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const CARD_GRADIENTS: [string, string][] = [
  ['#2563EB', '#0891B2'],
  ['#0F766E', '#0D9488'],
  ['#7C3AED', '#6D28D9'],
  ['#0369A1', '#0284C7'],
  ['#B45309', '#D97706'],
  ['#BE185D', '#DB2777'],
  ['#065F46', '#059669'],
  ['#1D4ED8', '#2563EB'],
  ['#9F1239', '#E11D48'],
  ['#374151', '#1F2937'],
];

function RestaurantCard({ r, index, onOpenQr }: { r: Restaurant; index: number; onOpenQr: (r: Restaurant) => void }) {
  const fallbacks = SWATCHES;
  const accent = r.accent_color || fallbacks[index % fallbacks.length];
  const lightAccent = accent + '14';
  const borderAccent = accent + '30';
  const [gradColor1, gradColor2] = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

  function getPathPart() {
    return `/cajero/${r.id}`;
  }

  const prizeCount = r.prize_count ?? 0;

  return (
    <div
      className="bg-white rounded-3xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-xl card-hover stagger-item"
      style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.05)' }}
    >
      {/* Unique gradient header per restaurant */}
      <div
        className="px-5 pt-5 pb-5 flex items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${gradColor1} 0%, ${gradColor2} 100%)` }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0"
          style={{
            background: 'rgba(255,255,255,0.18)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {initials(r.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-extrabold text-lg leading-tight truncate">{r.name}</h3>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold leading-none"
              style={{ background: 'rgba(255,255,255,0.20)', color: '#fff', border: '1px solid rgba(255,255,255,0.30)' }}
            >
              {prizeCount} premio{prizeCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <svg className="w-3 h-3 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-white/60 text-xs truncate">{r.address}</p>
          </div>
          {r.phone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <svg className="w-3 h-3 text-white/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <p className="text-white/60 text-xs">{r.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cajero link section */}
      <div className="px-5 py-4 flex-1">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">Link del cajero</p>
        <div
          className="rounded-xl px-3 py-2.5 flex items-start gap-2"
          style={{ background: lightAccent, border: `1px solid ${borderAccent}` }}
        >
          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: accent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <p
            className="text-xs leading-relaxed truncate"
            style={{ color: accent, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            {getPathPart()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-2">
        <Link
          href={`/admin/restaurantes/${r.id}`}
          className="flex items-center justify-center gap-1.5 border border-[#E8E3DC] hover:bg-stone-50 text-stone-600 font-semibold py-2.5 rounded-xl transition-all text-sm btn-press"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Ver Perfil
        </Link>

        <button
          onClick={() => onOpenQr(r)}
          className="flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-sm text-white transition-all duration-300 btn-press"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 4px 12px ${accent}40`,
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4h.01M8 8h.01M16 8h.01M4 12h.01M20 12h.01M8 16h.01M16 16h.01M12 20h.01M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4z" />
          </svg>
          Ver QR
        </button>
      </div>
    </div>
  );
}

export default function RestaurantesPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phone: '', accent_color: '#2563EB', google_maps_url: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [qrModalRest, setQrModalRest] = useState<Restaurant | null>(null);

  async function fetchRestaurants() {
    try {
      const res = await fetch('/api/restaurants');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestaurants(data.restaurants);
    } catch {
      setError('No se pudieron cargar los restaurantes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRestaurants().then(() => {
      // auto-open is handled after state updates via the restaurants effect below
    });
  }, []);

  useEffect(() => {
    if (!loading && restaurants.length === 0 && !error) {
      setShowForm(true);
    }
  }, [loading, restaurants.length, error]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, address: form.address, phone: form.phone, accent_color: form.accent_color, google_maps_url: form.google_maps_url || null }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Error al crear el restaurante.'); return; }
      setRestaurants((prev) => [data.restaurant, ...prev]);
      setForm({ name: '', address: '', phone: '', accent_color: '#2563EB', google_maps_url: '' });
      setShowForm(false);
    } catch {
      setFormError('Error de conexion. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full bg-white border border-[#E8E3DC] rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all hover:border-stone-300 shadow-sm';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              ️ Restaurantes
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Mis Restaurantes</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Configura cada sucursal y comparte su link de cajero</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm"
            style={{ background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Restaurante
          </button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">

        {/* New restaurant form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm mb-8 overflow-hidden pop-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Nuevo Restaurante</h2>
                <p className="text-gray-400 text-xs mt-0.5">Completa los datos de la sucursal</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Ej: Burrito Centro"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Direccion <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  required
                  placeholder="Calle, colonia, ciudad"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Telefono{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+52 55 1234 5678"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-3">
                <label className={labelClass}>
                  URL de Google Maps para resenas{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  value={form.google_maps_url}
                  onChange={(e) => setForm((p) => ({ ...p, google_maps_url: e.target.value }))}
                  placeholder="https://g.page/r/..."
                  className={inputClass}
                  type="url"
                />
                <p className="text-gray-400 text-xs mt-1.5">
                  Se mostrara un boton al cajero despues de entregar el premio para pedir resena al cliente.
                </p>
              </div>

              {/* Color picker */}
              <div className="sm:col-span-3">
                <label className={labelClass}>Color de acento de la sucursal</label>
                <div
                  className="rounded-xl border border-[#E8E3DC] bg-gray-50 px-4 py-3 flex items-center gap-4 flex-wrap"
                >
                  <ColorPicker
                    value={form.accent_color}
                    onChange={(c) => setForm((p) => ({ ...p, accent_color: c }))}
                  />
                  {/* Live preview strip */}
                  <div
                    className="hidden sm:block ml-auto rounded-xl px-4 py-2 text-white text-xs font-bold shadow-sm transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${form.accent_color}, ${form.accent_color}cc)`,
                      boxShadow: `0 4px 12px ${form.accent_color}40`,
                    }}
                  >
                    Vista previa
                  </div>
                </div>
              </div>

              {formError && (
                <div className="sm:col-span-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  {formError}
                </div>
              )}

              <div className="sm:col-span-3 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-[#E8E3DC] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 disabled:opacity-60 text-white font-bold rounded-xl transition-all text-sm"
                  style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)' }}
                >
                  {submitting ? 'Guardando...' : 'Guardar Restaurante'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-20 flex flex-col items-center gap-3">
            <div className="spinner-brand spinner-lg" />
            <p className="text-gray-400 text-sm">Cargando restaurantes...</p>
          </div>
        ) : restaurants.length === 0 ? (
          <SharedEmptyState
            type="no-restaurants"
            title="Comienza creando tu primer restaurante"
            subtitle="Cada restaurante tiene su propio link de cajero. Comparte ese link con el encargado de caja de cada sucursal."
            action={
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all"
                style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear mi primer restaurante
              </button>
            }
          />
        ) : (
          <>
            {/* Count badge */}
            <p className="text-stone-500 text-sm mb-5">
              <span className="font-medium">{restaurants.length}</span>{' '}
              restaurante{restaurants.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {restaurants.map((r, i) => (
                <RestaurantCard key={r.id} r={r} index={i} onOpenQr={(rest) => setQrModalRest(rest)} />
              ))}
            </div>
          </>
        )}
      </div>

      {qrModalRest && (
        <QRLinkModal restaurant={qrModalRest} onClose={() => setQrModalRest(null)} />
      )}
    </div>
  );
}
