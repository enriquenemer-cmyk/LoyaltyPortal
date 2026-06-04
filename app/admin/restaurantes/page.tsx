'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Restaurant = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  created_at: string;
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function RestaurantCard({ r, index }: { r: Restaurant; index: number }) {
  const [copied, setCopied] = useState(false);

  function getFullUrl() {
    return `${window.location.origin}/cajero/escanear?r=${encodeURIComponent(r.name)}`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(getFullUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // Accent color rotates per card
  const accents = ['#E8521A', '#7c3aed', '#0ea5e9', '#be185d', '#059669'];
  const accent = accents[index % accents.length];
  const lightAccent = accent + '18';
  const borderAccent = accent + '35';

  return (
    <div
      className="bg-white rounded-3xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.06)' }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />

      {/* Header row */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 4px 14px ${accent}40` }}
        >
          {initials(r.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-gray-900 font-extrabold text-lg leading-tight truncate">{r.name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-gray-400 text-xs truncate">{r.address}</p>
          </div>
          {r.phone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <p className="text-gray-400 text-xs">{r.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-gray-100" />

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
          <p className="text-xs leading-relaxed break-all" style={{ color: accent, fontFamily: 'monospace' }}>
            premia-tierra.vercel.app/cajero/escanear?r={encodeURIComponent(r.name)}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-2">
        <Link
          href={`/admin/restaurantes/${r.id}`}
          className="flex items-center justify-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold py-2.5 rounded-xl transition-all text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Ver Perfil
        </Link>

        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 font-bold py-2.5 rounded-xl text-sm text-white transition-all"
          style={{
            background: copied
              ? 'linear-gradient(135deg,#16a34a,#15803d)'
              : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: copied ? '0 4px 12px rgba(22,163,74,0.35)' : `0 4px 12px ${accent}40`,
          }}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              ¡Copiado!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar link
            </>
          )}
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
  const [form, setForm] = useState({ name: '', address: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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

  useEffect(() => { fetchRestaurants(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Error al crear el restaurante.'); return; }
      setRestaurants((prev) => [data.restaurant, ...prev]);
      setForm({ name: '', address: '', phone: '' });
      setShowForm(false);
    } catch {
      setFormError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all hover:border-gray-300 shadow-sm';
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

  return (
    <div className="min-h-screen bg-[#fdf8f5]">
      <div className="max-w-7xl mx-auto px-4 py-10">

        {/* Page header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4"
              style={{ background: 'rgba(232,82,26,0.10)', border: '1px solid rgba(232,82,26,0.25)', color: '#E8521A' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Restaurantes
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Gestión de <span className="gradient-text">Restaurantes</span>
            </h1>
            <p className="text-gray-500 mt-2 text-sm">Copia el link de cada restaurante y compártelo con el encargado de caja.</p>
          </div>

          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 text-white font-bold px-5 py-3 rounded-xl transition-all text-sm"
            style={{ background: 'linear-gradient(135deg,#E8521A,#C2410C)', boxShadow: '0 4px 16px rgba(232,82,26,0.35)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Restaurante
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Nuevo Restaurante</h2>
                <p className="text-gray-400 text-xs mt-0.5">Completa los datos del restaurante</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Nombre <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Ej: Tierra Burrito Centro" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Dirección <span className="text-red-400">*</span></label>
                <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required placeholder="Calle, colonia, ciudad" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Teléfono <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+52 55 1234 5678" className={inputClass} />
              </div>
              {formError && (
                <div className="sm:col-span-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{formError}</div>
              )}
              <div className="sm:col-span-3 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 disabled:opacity-60 text-white font-bold rounded-xl transition-all text-sm"
                  style={{ background: 'linear-gradient(135deg,#E8521A,#C2410C)' }}
                >
                  {submitting ? 'Guardando...' : 'Guardar Restaurante'}
                </button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">{error}</div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-20 text-center">
            <svg className="animate-spin w-8 h-8 mx-auto mb-3" style={{ color: '#E8521A' }} fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-gray-400 text-sm">Cargando restaurantes...</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(232,82,26,0.08)' }}>
              <svg className="w-8 h-8" style={{ color: 'rgba(232,82,26,0.4)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold">Aún no hay restaurantes registrados</p>
            <p className="text-gray-400 text-sm mt-1">Crea el primero con el botón &quot;Nuevo Restaurante&quot;</p>
          </div>
        ) : (
          <>
            {/* Count */}
            <p className="text-gray-400 text-sm mb-5">
              <span className="font-bold text-gray-700">{restaurants.length}</span> restaurante{restaurants.length !== 1 ? 's' : ''} registrado{restaurants.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {restaurants.map((r, i) => <RestaurantCard key={r.id} r={r} index={i} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
