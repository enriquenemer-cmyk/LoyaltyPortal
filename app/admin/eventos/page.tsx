'use client';
import { BoltIcon, CalendarIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';
import { useToast } from '@/app/components/Toast';

type EventType = 'double_points' | 'first_N' | 'min_amount_boost';

type RestaurantEvent = {
  id: string;
  restaurant_id: string;
  restaurant_name: string | null;
  name: string;
  description: string | null;
  event_type: EventType;
  multiplier: number;
  max_participants: number | null;
  participants_count: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_at: string;
};

type Restaurant = { id: string; name: string };

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  double_points: 'Doble Puntos',
  first_N: 'Primeros N ganan',
  min_amount_boost: 'Monto reducido',
};

const EVENT_TYPE_ICONS: Record<EventType, string> = {
  double_points: '',
  first_N: '',
  min_amount_boost: '',
};

function eventStatus(ev: RestaurantEvent): 'active' | 'scheduled' | 'ended' {
  const now = new Date();
  const start = new Date(ev.starts_at);
  const end = new Date(ev.ends_at);
  if (!ev.active || now > end) return 'ended';
  if (now < start) return 'scheduled';
  return 'active';
}

const STATUS_CONFIG = {
  active: { label: 'Activo', dot: 'bg-emerald-500 animate-pulse', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'Programado', dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  ended: { label: 'Terminado', dot: 'bg-stone-400', badge: 'bg-stone-50 text-stone-500 border-stone-200' },
};

function formatDt(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
}

export default function EventosPage() {
  const toast = useToast();
  const [events, setEvents] = useState<RestaurantEvent[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const localOffset = now.getTimezoneOffset();
  const localIso = (d: Date) => {
    const adj = new Date(d.getTime() - localOffset * 60000);
    return adj.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    restaurant_id: '',
    name: '',
    description: '',
    event_type: 'double_points' as EventType,
    multiplier: '2',
    max_participants: '',
    starts_at: localIso(now),
    ends_at: localIso(new Date(now.getTime() + 4 * 60 * 60 * 1000)),
    active: true,
  });

  async function loadData() {
    setLoading(true);
    try {
      const [evRes, restRes] = await Promise.all([
        fetch('/api/events?all=true'),
        fetch('/api/restaurants'),
      ]);
      if (evRes.ok) {
        const d = await evRes.json();
        setEvents(d.events ?? []);
      }
      if (restRes.ok) {
        const d = await restRes.json();
        setRestaurants(d.restaurants ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.restaurant_id || !form.name || !form.starts_at || !form.ends_at) {
      setError('Completa todos los campos requeridos.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: form.restaurant_id,
          name: form.name,
          description: form.description || null,
          event_type: form.event_type,
          multiplier: parseFloat(form.multiplier) || 2,
          max_participants: form.max_participants ? parseInt(form.max_participants) : null,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
          active: form.active,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Error al crear evento');
        return;
      }
      setShowForm(false);
      await loadData();
    } catch {
      setError('Error de conexión. No se pudo crear el evento.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnd(id: string) {
    setEnding(id);
    try {
      const res = await fetch('/api/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'end' }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? 'No se pudo terminar el evento.');
        return;
      }
      await loadData();
    } catch {
      toast.error('Error de conexión. No se pudo terminar el evento.');
    } finally {
      setEnding(null);
    }
  }

  const multiplierLabel: Record<EventType, string> = {
    double_points: 'Multiplicador de puntos (ej: 2 = doble)',
    first_N: 'N — primeros participantes con bonus',
    min_amount_boost: '% de reducción del monto mínimo (ej: 25 = 25% menos)',
  };

  const multiplierPlaceholder: Record<EventType, string> = {
    double_points: 'Ej: 2',
    first_N: 'Ej: 20',
    min_amount_boost: 'Ej: 25',
  };

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CalendarIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Eventos
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Eventos</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Crea eventos especiales para impulsar la participación de tus clientes</p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm"
            style={{ background: 'white', color: '#111111', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo evento
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">
      <div className="space-y-8">

      {/* Create form */}
      {showForm && (
        <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-[#1C1917] mb-5">Crear nuevo evento</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Restaurante *</label>
                <select
                  value={form.restaurant_id}
                  onChange={(e) => setForm((p) => ({ ...p, restaurant_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E8E3DC] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  required
                >
                  <option value="">Seleccionar restaurante</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Nombre del evento *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Noche de Martes, Happy Hour..."
                  className="w-full px-3 py-2 text-sm border border-[#E8E3DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Descripción</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Descripción breve (opcional)"
                className="w-full px-3 py-2 text-sm border border-[#E8E3DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Tipo de evento *</label>
                <select
                  value={form.event_type}
                  onChange={(e) => setForm((p) => ({ ...p, event_type: e.target.value as EventType }))}
                  className="w-full px-3 py-2 text-sm border border-[#E8E3DC] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                >
                  {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{EVENT_TYPE_ICONS[k]} {v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">{multiplierLabel[form.event_type]}</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.multiplier}
                  onChange={(e) => setForm((p) => ({ ...p, multiplier: e.target.value }))}
                  placeholder={multiplierPlaceholder[form.event_type]}
                  className="w-full px-3 py-2 text-sm border border-[#E8E3DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                />
              </div>
            </div>

            {form.event_type === 'first_N' && (
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Máximo de participantes con bonus</label>
                <input
                  type="number"
                  min="1"
                  value={form.max_participants}
                  onChange={(e) => setForm((p) => ({ ...p, max_participants: e.target.value }))}
                  placeholder="Ej: 20"
                  className="w-full px-3 py-2 text-sm border border-[#E8E3DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Inicio *</label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E8E3DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Fin *</label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-[#E8E3DC] rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.active}
                onClick={() => setForm((p) => ({ ...p, active: !p.active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-stone-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm font-medium text-stone-700">Activar ahora</span>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(''); }}
                className="flex-1 px-4 py-2 text-sm font-semibold text-stone-600 border border-[#E8E3DC] rounded-xl hover:bg-stone-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-2 px-6 py-2 text-sm font-bold text-white bg-[#F97316] rounded-xl hover:bg-orange-500 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Creando...' : 'Crear evento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="text-center py-16 text-stone-400 text-sm">Cargando eventos...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4"><BoltIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></div>
          <p className="text-stone-500 text-sm">No hay eventos creados aún.</p>
          <p className="text-stone-400 text-xs mt-1">Crea un evento para motivar a tus clientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const st = eventStatus(ev);
            const cfg = STATUS_CONFIG[st];
            return (
              <div
                key={ev.id}
                className="bg-white border border-[#E8E3DC] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-xl shrink-0">
                    {EVENT_TYPE_ICONS[ev.event_type]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[#1C1917] truncate">{ev.name}</p>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-stone-500 mt-0.5 truncate">{ev.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                      <span className="text-xs text-stone-400">{ev.restaurant_name ?? ev.restaurant_id}</span>
                      <span className="text-xs text-stone-400">{EVENT_TYPE_LABELS[ev.event_type]}</span>
                      {ev.event_type === 'double_points' && (
                        <span className="text-xs text-orange-600 font-semibold">x{ev.multiplier} puntos</span>
                      )}
                      {ev.event_type === 'first_N' && (
                        <span className="text-xs text-orange-600 font-semibold">
                          {ev.participants_count} / {ev.max_participants ?? '∞'} participantes
                        </span>
                      )}
                      {ev.event_type === 'min_amount_boost' && (
                        <span className="text-xs text-orange-600 font-semibold">{ev.multiplier}% de reducción</span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {formatDt(ev.starts_at)} — {formatDt(ev.ends_at)}
                    </p>
                  </div>
                </div>

                {st === 'active' && (
                  <button
                    onClick={() => handleEnd(ev.id)}
                    disabled={ending === ev.id}
                    className="shrink-0 px-4 py-2 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {ending === ev.id ? 'Terminando...' : 'Terminar evento ahora'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
