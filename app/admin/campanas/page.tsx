'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const QRPreview = dynamic(() => import('./QRPreview'), { ssr: false });

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  restaurant_id: string | null;
  created_at: string;
  qr_dot_color: string;
  qr_background: string;
  qr_dot_style: string;
  qr_corner_style: string;
  qr_gradient_end: string | null;
};

type Restaurant = { id: string; name: string };

const labelClass = 'block text-[10px] font-semibold text-[#78716c] uppercase tracking-widest mb-1.5';
const inputClass = 'w-full bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:border-[#2563EB] transition-colors';

const DOT_STYLES = [
  { value: 'square', label: 'Cuadrados' },
  { value: 'dots', label: 'Circulos' },
  { value: 'rounded', label: 'Redondeados' },
  { value: 'classy-rounded', label: 'Elegante' },
  { value: 'extra-rounded', label: 'Suave' },
];

const CORNER_STYLES = [
  { value: 'square', label: 'Cuadrado' },
  { value: 'extra-rounded', label: 'Redondeado' },
  { value: 'dot', label: 'Punto' },
];

const DEFAULT_STYLE = {
  qr_dot_color: '#0f172a',
  qr_background: '#ffffff',
  qr_dot_style: 'square',
  qr_corner_style: 'square',
  qr_gradient_end: '',
};

type FormState = {
  name: string;
  description: string;
  restaurant_id: string;
  qr_dot_color: string;
  qr_background: string;
  qr_dot_style: string;
  qr_corner_style: string;
  qr_gradient_end: string;
};

export default function CampanasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    restaurant_id: '',
    ...DEFAULT_STYLE,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/campaigns').then(r => r.json()),
      fetch('/api/restaurants').then(r => r.json()),
    ]).then(([campData, restData]) => {
      setCampaigns(campData.campaigns ?? []);
      setRestaurants(restData.restaurants ?? []);
    }).finally(() => setLoading(false));
  }, []);

  function openNew() {
    setEditingId(null);
    setForm({ name: '', description: '', restaurant_id: '', ...DEFAULT_STYLE });
    setError('');
    setShowForm(true);
  }

  function openEdit(c: Campaign) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      description: c.description ?? '',
      restaurant_id: c.restaurant_id ?? '',
      qr_dot_color: c.qr_dot_color ?? '#0f172a',
      qr_background: c.qr_background ?? '#ffffff',
      qr_dot_style: c.qr_dot_style ?? 'square',
      qr_corner_style: c.qr_corner_style ?? 'square',
      qr_gradient_end: c.qr_gradient_end ?? '',
    });
    setError('');
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const body = {
      ...form,
      qr_gradient_end: form.qr_gradient_end || null,
    };
    try {
      const url = editingId ? `/api/campaigns/${editingId}` : '/api/campaigns';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al guardar.'); return; }
      if (editingId) {
        setCampaigns(prev => prev.map(c => c.id === editingId ? data.campaign : c));
      } else {
        setCampaigns(prev => [data.campaign, ...prev]);
      }
      setForm({ name: '', description: '', restaurant_id: '', ...DEFAULT_STYLE });
      setEditingId(null);
      setShowForm(false);
    } catch { setError('Error de conexion.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta campana?')) return;
    setDeletingId(id);
    try {
      await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } finally { setDeletingId(null); }
  }

  const previewStyle = {
    qr_dot_color: form.qr_dot_color,
    qr_background: form.qr_background,
    qr_dot_style: form.qr_dot_style,
    qr_corner_style: form.qr_corner_style,
    qr_gradient_end: form.qr_gradient_end || null,
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-5xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              📣 Marketing
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Mis Campañas</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Agrupa premios por campaña y personaliza sus códigos QR</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all"
            style={{ background: 'white', color: '#1d4ed8', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva campaña
          </button>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-10 py-6">

        {showForm && (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 mb-6">
            <h2 className="text-base font-bold text-[#1C1917] mb-4">
              {editingId ? 'Editar campana' : 'Nueva campana'}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={handleSave} className="lg:col-span-2 space-y-4">
                <div>
                  <label className={labelClass}>Nombre *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Ej: Verano 2026"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Descripcion</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    placeholder="Descripcion opcional de la campana"
                    className={inputClass + ' resize-none'}
                  />
                </div>
                <div>
                  <label className={labelClass}>Restaurante</label>
                  <select
                    value={form.restaurant_id}
                    onChange={e => setForm(p => ({ ...p, restaurant_id: e.target.value }))}
                    className={inputClass}
                  >
                    <option value="">Sin restaurante</option>
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* QR Personalización */}
                <div className="border border-[#E8E3DC] rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-bold text-[#78716c] uppercase tracking-widest">QR Personalizacion</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelClass}>Color principal</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.qr_dot_color}
                          onChange={e => setForm(p => ({ ...p, qr_dot_color: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-[#E8E3DC] cursor-pointer"
                        />
                        <span className="text-xs text-[#78716c] font-mono">{form.qr_dot_color}</span>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Color de fondo</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.qr_background}
                          onChange={e => setForm(p => ({ ...p, qr_background: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-[#E8E3DC] cursor-pointer"
                        />
                        <span className="text-xs text-[#78716c] font-mono">{form.qr_background}</span>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Color secundario (gradiente)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.qr_gradient_end || form.qr_dot_color}
                          onChange={e => setForm(p => ({ ...p, qr_gradient_end: e.target.value }))}
                          className="w-10 h-10 rounded-lg border border-[#E8E3DC] cursor-pointer"
                        />
                        {form.qr_gradient_end && (
                          <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, qr_gradient_end: '' }))}
                            className="text-xs text-[#a8a29e] hover:text-red-500 transition-colors"
                          >
                            Quitar
                          </button>
                        )}
                        {!form.qr_gradient_end && (
                          <span className="text-xs text-[#a8a29e]">Sin gradiente</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Estilo de puntos</label>
                    <div className="flex flex-wrap gap-2">
                      {DOT_STYLES.map(s => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, qr_dot_style: s.value }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            form.qr_dot_style === s.value
                              ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                              : 'border-[#E8E3DC] text-[#78716c] hover:border-[#2563EB]/40'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Estilo de esquinas</label>
                    <div className="flex flex-wrap gap-2">
                      {CORNER_STYLES.map(s => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, qr_corner_style: s.value }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            form.qr_corner_style === s.value
                              ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                              : 'border-[#E8E3DC] text-[#78716c] hover:border-[#2563EB]/40'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                    style={{ background: '#2563EB' }}
                  >
                    {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear campana'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setEditingId(null); }}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold border border-[#E8E3DC] text-[#78716c] hover:bg-[#FAFAF9] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>

              {/* Live preview */}
              <div className="lg:col-span-1 flex flex-col items-center gap-3">
                <span className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-widest">Vista previa</span>
                <div className="p-3 bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl">
                  <QRPreview style={previewStyle} size={160} />
                </div>
                <p className="text-xs text-[#a8a29e] text-center">Se actualiza en tiempo real</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#E8E3DC] rounded-2xl p-5 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 mr-3 space-y-2">
                    <div className="h-4 bg-stone-200 rounded-lg w-3/4" />
                    <div className="h-3 bg-stone-100 rounded-lg w-full" />
                  </div>
                  <div className="w-16 h-16 bg-stone-100 rounded-xl shrink-0" />
                </div>
                <div className="flex items-center gap-2 pt-3 border-t border-[#E8E3DC]">
                  <div className="h-7 bg-stone-100 rounded-lg flex-1" />
                  <div className="h-7 bg-stone-100 rounded-lg flex-1" />
                  <div className="h-7 w-7 bg-stone-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <p className="text-[#1C1917] font-bold text-lg mb-1">Sin campanas</p>
            <p className="text-[#78716c] text-sm">Crea tu primera campana para organizar tus premios y personalizar sus QRs</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(campaign => {
              const cardStyle = {
                qr_dot_color: campaign.qr_dot_color ?? '#0f172a',
                qr_background: campaign.qr_background ?? '#ffffff',
                qr_dot_style: campaign.qr_dot_style ?? 'square',
                qr_corner_style: campaign.qr_corner_style ?? 'square',
                qr_gradient_end: campaign.qr_gradient_end ?? null,
              };
              return (
                <div
                  key={campaign.id}
                  className="bg-white border border-[#E8E3DC] rounded-2xl p-5"
                  style={{ boxShadow: '0 1px 4px rgba(28,25,23,0.06)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 mr-3">
                      <h3 className="font-bold text-[#1C1917] text-base leading-tight truncate">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-xs text-[#78716c] mt-0.5 leading-relaxed line-clamp-2">{campaign.description}</p>
                      )}
                      {campaign.restaurant_id && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full mt-2">
                          {restaurants.find(r => r.id === campaign.restaurant_id)?.name ?? 'Restaurante'}
                        </span>
                      )}
                    </div>
                    <div className="p-1 bg-[#FAFAF9] rounded-lg border border-[#E8E3DC] shrink-0">
                      <QRPreview style={cardStyle} size={80} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-[#E8E3DC]">
                    <button
                      onClick={() => openEdit(campaign)}
                      className="text-xs font-semibold text-[#78716c] hover:text-[#1C1917] transition-colors"
                    >
                      Editar
                    </button>
                    <span className="text-[#E8E3DC]">|</span>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      disabled={deletingId === campaign.id}
                      className="text-xs font-semibold text-[#a8a29e] hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deletingId === campaign.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                    <span className="ml-auto text-xs text-[#a8a29e]">
                      {new Date(campaign.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
