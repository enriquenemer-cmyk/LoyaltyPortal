'use client';

import { useEffect, useState } from 'react';

type MerchItem = {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  points_cost: number;
  stock: number | null;
  active: boolean;
  created_at: string;
};

type Redemption = {
  id: string;
  merch_item_id: string;
  phone: string;
  points_spent: number;
  status: string;
  created_at: string;
};

export default function MerchPage() {
  const [items, setItems] = useState<MerchItem[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', points_cost: 200, stock: '' });
  const [redeemPhone, setRedeemPhone] = useState('');
  const [redeemResult, setRedeemResult] = useState('');

  async function load() {
    const [itemsRes, redRes] = await Promise.all([
      fetch('/api/merch'),
      fetch('/api/merch/redemptions').catch(() => ({ ok: false, json: () => ({ redemptions: [] }) })),
    ]);
    const itemsData = await itemsRes.json();
    setItems(itemsData.items ?? []);
    if ((redRes as Response).ok) {
      const redData = await (redRes as Response).json();
      setRedemptions(redData.redemptions ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/merch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        name: form.name,
        description: form.description || null,
        points_cost: form.points_cost,
        stock: form.stock ? parseInt(form.stock) : null,
      }),
    });
    setForm({ name: '', description: '', points_cost: 200, stock: '' });
    await load();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await fetch('/api/merch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) });
    await load();
  }

  async function handleRedeem(itemId: string) {
    if (!redeemPhone) return;
    setRedeemResult('');
    const res = await fetch('/api/merch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'redeem', id: itemId, phone: redeemPhone }),
    });
    const d = await res.json();
    setRedeemResult(d.ok ? `Canjeado correctamente para ${redeemPhone}` : (d.error ?? 'Error'));
    if (d.ok) await load();
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
               Merchandise
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Merchandise</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Productos físicos que los clientes canjean con puntos</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">

        {/* Create */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-6">
          <h2 className="text-sm font-bold text-[#1C1917] mb-4">Agregar producto</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-stone-500 mb-1">Nombre</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Gorra ST" className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Descripción</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Opcional" className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm w-44 focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Puntos</label>
              <input type="number" required min={1} value={form.points_cost} onChange={e => setForm(f => ({ ...f, points_cost: parseInt(e.target.value) }))}
                className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm w-24 focus:outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Stock (opt.)</label>
              <input type="number" min={1} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                placeholder="∞" className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm w-20 focus:outline-none focus:border-[#2563EB]" />
            </div>
            <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60" style={{ background: '#2563EB' }}>
              {saving ? 'Guardando...' : '+ Agregar'}
            </button>
          </form>
        </div>

        {/* Redeem panel */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-6">
          <h2 className="text-sm font-bold text-[#1C1917] mb-3">Canjear para un cliente</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-stone-500 mb-1">Teléfono del cliente</label>
              <input value={redeemPhone} onChange={e => setRedeemPhone(e.target.value)}
                placeholder="5512345678" className="w-full border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]" />
            </div>
          </div>
          {redeemResult && (
            <p className={`text-sm mt-3 font-semibold ${redeemResult.includes('Error') || redeemResult.includes('error') ? 'text-red-600' : 'text-emerald-600'}`}>{redeemResult}</p>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E3DC]">
            <h2 className="text-sm font-bold text-[#1C1917]">Catálogo activo</h2>
          </div>
          {loading ? (
            <div className="py-10 text-center text-stone-400 text-sm">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-sm">Sin productos aún.</div>
          ) : (
            <div className="divide-y divide-[#F3EFE9]">
              {items.map(item => (
                <div key={item.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1C1917]">{item.name}</p>
                    {item.description && <p className="text-xs text-stone-400">{item.description}</p>}
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{item.points_cost} pts</span>
                      {item.stock !== null && <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-semibold">Stock: {item.stock}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRedeem(item.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  >
                    Canjear
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-100 text-red-500 hover:bg-red-50">
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
