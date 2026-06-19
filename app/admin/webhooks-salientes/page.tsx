'use client';

import { useEffect, useState } from 'react';

type Webhook = {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
};

const ALL_EVENTS = [
  'tier_upgrade', 'tier_downgrade', 'claim_created', 'claim_delivered',
  'gift_card_redeemed', 'merch_redeemed', 'referral_reward', 'boost_activated',
  'vip_subscription_activated',
];

export default function WebhooksSalientesPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', url: '', secret: '', events: [] as string[] });

  async function load() {
    const res = await fetch('/api/webhooks-outgoing');
    const d = await res.json();
    setWebhooks(d.webhooks ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url) return;
    setSaving(true);
    await fetch('/api/webhooks-outgoing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, url: form.url, secret: form.secret || null, events: form.events }),
    });
    setForm({ name: '', url: '', secret: '', events: [] });
    await load();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch('/api/webhooks-outgoing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    await load();
  }

  async function handleTest(id: string) {
    setTesting(id);
    const res = await fetch('/api/webhooks-outgoing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', id }) });
    const d = await res.json();
    setTestResult(r => ({ ...r, [id]: d.ok ? `OK (HTTP ${d.status})` : `Error: ${d.error ?? d.status}` }));
    setTesting(null);
  }

  function toggleEvent(ev: string) {
    setForm(f => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter(e => e !== ev) : [...f.events, ev],
    }));
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-bold text-[#2563EB] uppercase tracking-widest mb-1">Integraciones</p>
          <h1 className="text-2xl font-bold text-[#1C1917]">Webhooks Salientes</h1>
          <p className="text-sm text-stone-500 mt-1">Envía eventos a Zapier, Make, o cualquier URL cuando algo ocurre</p>
        </div>

        {/* Create */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-6">
          <h2 className="text-sm font-bold text-[#1C1917] mb-4">Nuevo webhook</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Nombre</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Zapier — Tier upgrade"
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">URL destino</label>
                <input required type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://hooks.zapier.com/..."
                  className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Secret HMAC (opcional — valida la firma en tu app)</label>
              <input type="password" value={form.secret} onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
                placeholder="mi-secreto-seguro"
                className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-2">Eventos a escuchar</label>
              <div className="flex flex-wrap gap-2">
                {ALL_EVENTS.map(ev => (
                  <button key={ev} type="button" onClick={() => toggleEvent(ev)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${form.events.includes(ev) ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-stone-600 border-[#E8E3DC] hover:border-[#2563EB]'}`}>
                    {ev}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: '#2563EB' }}>
              {saving ? 'Guardando...' : '+ Crear webhook'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E3DC]">
            <h2 className="text-sm font-bold text-[#1C1917]">Webhooks configurados</h2>
          </div>
          {loading ? (
            <div className="py-10 text-center text-stone-400 text-sm">Cargando...</div>
          ) : webhooks.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-sm">Sin webhooks aún. Crea el primero arriba.</div>
          ) : (
            <div className="divide-y divide-[#F3EFE9]">
              {webhooks.map(wh => (
                <div key={wh.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-[#1C1917]">{wh.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${wh.active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                          {wh.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 font-mono truncate">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {wh.events.map(ev => (
                          <span key={ev} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{ev}</span>
                        ))}
                      </div>
                      {wh.last_triggered_at && (
                        <p className="text-xs text-stone-400 mt-1">Último disparo: {new Date(wh.last_triggered_at).toLocaleString('es-MX')}</p>
                      )}
                      {testResult[wh.id] && (
                        <p className={`text-xs mt-1 font-semibold ${testResult[wh.id].startsWith('OK') ? 'text-emerald-600' : 'text-red-600'}`}>{testResult[wh.id]}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleTest(wh.id)} disabled={testing === wh.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#E8E3DC] text-stone-600 hover:bg-stone-50 disabled:opacity-50">
                        {testing === wh.id ? 'Enviando...' : 'Test'}
                      </button>
                      <button onClick={() => handleDelete(wh.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 text-red-500 hover:bg-red-50">
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Zapier instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mt-6">
          <p className="text-sm font-bold text-blue-800 mb-2">Cómo conectar con Zapier</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>En Zapier, crea un Zap con trigger "Webhooks by Zapier → Catch Hook"</li>
            <li>Copia la URL de webhook que te da Zapier</li>
            <li>Pégala aquí y selecciona los eventos que quieres escuchar</li>
            <li>Usa el botón "Test" para verificar que funciona</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
