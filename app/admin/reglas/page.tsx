'use client';

import { useEffect, useState } from 'react';

type Restaurant = { id: string; name: string };

type PrizeRule = {
  id: string;
  name: string;
  trigger_type: 'nth_claim' | 'birthday' | 'points_milestone';
  trigger_value: number;
  prize_template: string;
  prize_reason: string;
  prize_description: string;
  validity_days: number;
  restaurant_id: string | null;
  active: boolean;
  created_at: string;
};

const TEMPLATES = [
  { name: '2x1 en principales', reason: 'Por tu visita especial', description: 'Disfruta dos principales al precio de uno en cualquier opción del menú.' },
  { name: 'Bebida gratis', reason: 'Premio de fidelidad', description: 'Una bebida de tu elección completamente gratis con la compra de cualquier principal.' },
  { name: '10% de descuento', reason: 'Cliente frecuente', description: '10% de descuento en tu consumo total del día.' },
  { name: 'Postre gratis', reason: 'Por tu cumpleaños', description: 'Un postre de temporada gratis para celebrar tu cumpleaños.' },
  { name: 'Burrito gratis', reason: 'Concurso ganador', description: 'Un burrito de tu elección completamente gratis, del tamaño que prefieras.' },
  { name: 'Combo especial', reason: 'Premio especial', description: 'Combo especial: principal + bebida + postre a precio especial.' },
];

const TRIGGER_LABELS: Record<string, string> = {
  nth_claim: 'Cada N cobros',
  birthday: 'Cumpleanos',
  points_milestone: 'Hito de puntos',
};

const TRIGGER_DESCRIPTIONS: Record<string, (v: number) => string> = {
  nth_claim: (v) => `Cuando un cliente alcance su cobro #${v} (y cada multiplo de ${v})`,
  birthday: (_v) => 'En el dia de cumpleanos del cliente',
  points_milestone: (v) => `Cuando el cliente acumule ${v} puntos`,
};

const inputClass =
  'w-full bg-white border border-[#E8E3DC] rounded-lg px-3 py-2.5 text-sm text-[#1C1917] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors';

const labelClass = 'block text-[10px] font-semibold text-[#78716c] uppercase tracking-widest mb-1.5';

export default function ReglasPrizePage() {
  const [rules, setRules] = useState<PrizeRule[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    trigger_type: 'nth_claim',
    trigger_value: 5,
    prize_template: TEMPLATES[0].name,
    prize_reason: TEMPLATES[0].reason,
    prize_description: TEMPLATES[0].description,
    validity_days: 30,
    restaurant_id: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/prize-rules').then(r => r.json()),
      fetch('/api/restaurants').then(r => r.json()),
    ]).then(([rulesData, restData]) => {
      setRules(rulesData.rules ?? []);
      setRestaurants(restData.restaurants ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function handleTemplateChange(templateName: string) {
    const tpl = TEMPLATES.find(t => t.name === templateName);
    if (tpl) {
      setForm(f => ({ ...f, prize_template: tpl.name, prize_reason: tpl.reason, prize_description: tpl.description }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/prize-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          restaurant_id: form.restaurant_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Error al guardar la regla.');
      } else {
        setRules(prev => [data.rule, ...prev]);
        setSuccess('Regla creada exitosamente.');
        setShowForm(false);
        setForm({
          name: '',
          trigger_type: 'nth_claim',
          trigger_value: 5,
          prize_template: TEMPLATES[0].name,
          prize_reason: TEMPLATES[0].reason,
          prize_description: TEMPLATES[0].description,
          validity_days: 30,
          restaurant_id: '',
        });
      }
    } catch {
      setError('Error de conexion.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(rule: PrizeRule) {
    const next = !rule.active;
    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: next } : r));
    try {
      const res = await fetch('/api/prize-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _action: 'toggle', id: rule.id, active: next }),
      });
      if (!res.ok) {
        // revert
        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: rule.active } : r));
      }
    } catch {
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, active: rule.active } : r));
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E3DC] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1C1917] tracking-tight">Reglas de Premios</h1>
            <p className="text-sm text-stone-500 mt-0.5">Automatiza la entrega de premios segun el comportamiento del cliente</p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setError(''); setSuccess(''); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#0891B2] transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? 'M6 18L18 6M6 6l12 12' : 'M12 4v16m8-8H4'} />
            </svg>
            {showForm ? 'Cancelar' : 'Nueva regla'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Success/Error */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm font-medium">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl p-6 shadow-sm"
            style={{ borderTop: '3px solid #2563EB' }}>
            <h2 className="text-base font-bold text-[#1C1917] mb-5">Nueva regla automatica</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className={labelClass}>Nombre de la regla</label>
                <input
                  className={inputClass}
                  placeholder="Ej. Premio por 5to cobro"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              {/* Trigger type + value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Tipo de activador</label>
                  <select
                    className={inputClass}
                    value={form.trigger_type}
                    onChange={e => setForm(f => ({ ...f, trigger_type: e.target.value }))}
                  >
                    <option value="nth_claim">Cada N cobros</option>
                    <option value="birthday">Cumpleanos</option>
                    <option value="points_milestone">Hito de puntos</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    {form.trigger_type === 'nth_claim' ? 'Cada cuantos cobros' :
                     form.trigger_type === 'points_milestone' ? 'Puntos necesarios' :
                     'Valor (dias antes)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    value={form.trigger_value}
                    onChange={e => setForm(f => ({ ...f, trigger_value: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              {/* Preview sentence */}
              {form.trigger_type in TRIGGER_DESCRIPTIONS && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-[#92400E]">
                  <span className="font-semibold">Cuando activar: </span>
                  {TRIGGER_DESCRIPTIONS[form.trigger_type]?.(form.trigger_value)}, generar automaticamente:{' '}
                  <span className="font-semibold">{form.prize_template}</span>
                </div>
              )}

              {/* Prize template */}
              <div>
                <label className={labelClass}>Premio a generar</label>
                <select
                  className={inputClass}
                  value={form.prize_template}
                  onChange={e => handleTemplateChange(e.target.value)}
                >
                  {TEMPLATES.map(t => (
                    <option key={t.name} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Reason + Description (auto-filled, editable) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Razon del premio</label>
                  <input
                    className={inputClass}
                    value={form.prize_reason}
                    onChange={e => setForm(f => ({ ...f, prize_reason: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Validez (dias)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    className={inputClass}
                    value={form.validity_days}
                    onChange={e => setForm(f => ({ ...f, validity_days: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Descripcion del premio</label>
                <textarea
                  className={inputClass + ' resize-none'}
                  rows={2}
                  value={form.prize_description}
                  onChange={e => setForm(f => ({ ...f, prize_description: e.target.value }))}
                  required
                />
              </div>

              {/* Restaurant filter */}
              <div>
                <label className={labelClass}>Restaurante (opcional — aplica a todos si se deja vacio)</label>
                <select
                  className={inputClass}
                  value={form.restaurant_id}
                  onChange={e => setForm(f => ({ ...f, restaurant_id: e.target.value }))}
                >
                  <option value="">Todos los restaurantes</option>
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#0891B2] transition-colors disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Crear regla'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm font-medium">No hay reglas configuradas</p>
            <p className="text-xs mt-1">Crea tu primera regla para automatizar premios</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => {
              const triggerDesc = TRIGGER_DESCRIPTIONS[rule.trigger_type]?.(rule.trigger_value) ?? '';
              return (
                <div
                  key={rule.id}
                  className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${rule.active ? 'border-blue-200' : 'border-[#E8E3DC] opacity-60'}`}
                  style={rule.active ? { borderLeft: '4px solid #2563EB' } : { borderLeft: '4px solid #D6D3D1' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#1C1917]">{rule.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rule.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                          {rule.active ? 'Activa' : 'Inactiva'}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {TRIGGER_LABELS[rule.trigger_type]}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 mt-1.5 leading-snug">
                        {triggerDesc}{triggerDesc ? ', generar automaticamente: ' : ''}
                        <span className="font-semibold text-[#1C1917]">{rule.prize_template}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-stone-400">
                        <span>Validez: {rule.validity_days} dias</span>
                        {rule.restaurant_id ? (
                          <span>Restaurante especifico</span>
                        ) : (
                          <span>Todos los restaurantes</span>
                        )}
                        <span>Creada: {new Date(rule.created_at).toLocaleDateString('es-MX')}</span>
                      </div>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(rule)}
                      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${rule.active ? 'bg-[#2563EB]' : 'bg-stone-200'}`}
                      aria-label={rule.active ? 'Desactivar regla' : 'Activar regla'}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${rule.active ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
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
