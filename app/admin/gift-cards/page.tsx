'use client';
import { GiftIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';
import { useToast } from '@/app/components/Toast';

type GiftCard = {
  id: string;
  code: string;
  amount_mxn: number;
  points: number;
  purchased_by_phone: string | null;
  purchased_by_email: string | null;
  redeemed_by_phone: string | null;
  redeemed_at: string | null;
  created_at: string;
};

export default function GiftCardsPage() {
  const toast = useToast();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ amount_mxn: 200, purchased_by_phone: '', purchased_by_email: '' });
  const [newCard, setNewCard] = useState<GiftCard | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/gift-cards');
      const d = await res.json();
      setCards(d.gift_cards ?? []);
    } catch {
      toast.error('Error al cargar las gift cards');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setNewCard(null);
    try {
      const res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...form, points: Math.round(form.amount_mxn / 2) }),
      });
      const d = await res.json();
      if (d.gift_card) {
        setNewCard(d.gift_card);
        await load();
      } else {
        toast.error(d.error ?? 'Error al crear la gift card');
      }
    } catch {
      toast.error('Error de conexión al crear la gift card');
    } finally {
      setCreating(false);
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error('No se pudo copiar el código');
    });
  }

  const active = cards.filter(c => !c.redeemed_at);
  const redeemed = cards.filter(c => !!c.redeemed_at);

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <GiftIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Gift Cards
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Gift Cards</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Genera códigos que los clientes canjean por puntos</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-4">
            <p className="text-2xl font-extrabold text-[#1C1917] tabular-nums">{cards.length}</p>
            <p className="text-xs text-stone-500 mt-1">Gift cards creadas</p>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-2xl font-extrabold text-emerald-700 tabular-nums">{active.length}</p>
            <p className="text-xs text-stone-500 mt-1">Sin canjear</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-4">
            <p className="text-2xl font-extrabold text-[#1C1917] tabular-nums">{redeemed.length}</p>
            <p className="text-xs text-stone-500 mt-1">Canjeadas</p>
          </div>
        </div>

        {/* Create */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-6">
          <h2 className="text-sm font-bold text-[#1C1917] mb-4">Crear nueva gift card</h2>
          <form onSubmit={handleCreate} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Valor ($COP)</label>
              <select
                value={form.amount_mxn}
                onChange={e => setForm(f => ({ ...f, amount_mxn: parseInt(e.target.value) }))}
                className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#F97316]"
              >
                {[100, 200, 500, 1000].map(v => <option key={v} value={v}>${v} COP ({Math.round(v / 2)} pts)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Teléfono comprador (opcional)</label>
              <input
                value={form.purchased_by_phone}
                onChange={e => setForm(f => ({ ...f, purchased_by_phone: e.target.value }))}
                placeholder="5512345678"
                className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm w-40 focus:outline-none focus:border-[#F97316]"
              />
            </div>
            <button
              type="submit" disabled={creating}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
              style={{ background: '#F97316' }}
            >
              {creating ? 'Creando...' : '+ Crear gift card'}
            </button>
          </form>

          {newCard && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-xs font-bold text-emerald-700 mb-2">Gift card creada exitosamente</p>
              <div className="flex items-center gap-3">
                <code className="text-xl font-bold text-emerald-800 tracking-widest">{newCard.code}</code>
                <button
                  onClick={() => copyCode(newCard.code)}
                  className="text-xs bg-white border border-emerald-300 px-3 py-1 rounded-lg text-emerald-700 hover:bg-emerald-50"
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-emerald-600 mt-1">${newCard.amount_mxn} COP · {newCard.points} puntos</p>
            </div>
          )}
        </div>

        {/* Cards table */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E3DC]">
            <h2 className="text-sm font-bold text-[#1C1917]">Todas las gift cards</h2>
          </div>
          {loading ? (
            <div className="py-10 text-center text-stone-400 text-sm">Cargando...</div>
          ) : cards.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-sm">Sin gift cards aún. Crea la primera arriba.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E3DC] text-left text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    <th className="px-6 py-3">Código</th>
                    <th className="px-6 py-3">Valor</th>
                    <th className="px-6 py-3">Puntos</th>
                    <th className="px-6 py-3">Estado</th>
                    <th className="px-6 py-3">Canjeado por</th>
                    <th className="px-6 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EFE9]">
                  {cards.map(c => (
                    <tr key={c.id} className="hover:bg-stone-50/50">
                      <td className="px-6 py-3 font-mono font-bold text-xs tracking-widest">{c.code}</td>
                      <td className="px-6 py-3 tabular-nums">${c.amount_mxn}</td>
                      <td className="px-6 py-3 tabular-nums text-orange-700 font-semibold">{c.points} pts</td>
                      <td className="px-6 py-3">
                        {c.redeemed_at ? (
                          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-semibold">Canjeada</span>
                        ) : (
                          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">Activa</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-stone-500 font-mono text-xs">{c.redeemed_by_phone ?? '—'}</td>
                      <td className="px-6 py-3 text-stone-400 text-xs whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
