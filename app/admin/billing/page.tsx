'use client';
import { CreditCardIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';

type Restaurant = {
  id: string;
  name: string;
  billing_plan: string | null;
  billing_status: string | null;
  billing_expires_at: string | null;
};

const PLAN_LABEL: Record<string, string> = { free: 'Gratis', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
const PLAN_PRICE: Record<string, string> = { free: '$0', starter: '$299', pro: '$599', enterprise: 'Contacto' };

export default function BillingPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetch('/api/restaurants')
      .then(r => r.json())
      .then(d => { setRestaurants(d.restaurants ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function generateLink(restaurantId: string) {
    if (!email) { alert('Ingresa el email del restaurante primero'); return; }
    setGenerating(restaurantId);
    try {
      const res = await fetch('/api/stripe/restaurant-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, email, plan: 'pro' }),
      });
      const d = await res.json();
      if (d.url) setLinks(l => ({ ...l, [restaurantId]: d.url }));
      else alert(d.error ?? 'Error al generar link');
    } catch { alert('Error de conexión'); }
    finally { setGenerating(null); }
  }

  const STATUS_BADGE: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    past_due: 'bg-amber-50 text-amber-700',
    canceled: 'bg-red-50 text-red-600',
    free: 'bg-stone-100 text-stone-500',
  };

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <CreditCardIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Facturación
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Facturación</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Cobra $299–$599/mes por restaurante usando Stripe</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">

        {/* Plans */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { key: 'free', desc: 'Hasta 1 restaurante, funciones básicas' },
            { key: 'starter', desc: 'Hasta 3 restaurantes, analytics básico' },
            { key: 'pro', desc: 'Restaurantes ilimitados, todo incluido' },
            { key: 'enterprise', desc: 'Soporte dedicado + integraciones custom' },
          ].map(p => (
            <div key={p.key} className="bg-white rounded-2xl border border-[#E8E3DC] p-4">
              <p className="text-lg font-extrabold text-[#1C1917]">{PLAN_PRICE[p.key]}<span className="text-xs font-normal text-stone-400">/mes</span></p>
              <p className="text-xs font-bold text-stone-600 mt-0.5">{PLAN_LABEL[p.key]}</p>
              <p className="text-xs text-stone-400 mt-1">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Email input */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-6">
          <h2 className="text-sm font-bold text-[#1C1917] mb-3">Generar link de pago</h2>
          <div className="flex gap-3">
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              placeholder="email@restaurante.com"
              className="flex-1 border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <p className="text-xs text-stone-400 mt-2">Luego haz click en "Generar link" en el restaurante deseado</p>
        </div>

        {/* Restaurants table */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E3DC]">
            <h2 className="text-sm font-bold text-[#1C1917]">Restaurantes</h2>
          </div>
          {loading ? (
            <div className="py-10 text-center text-stone-400 text-sm">Cargando...</div>
          ) : restaurants.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-sm">Sin restaurantes registrados.</div>
          ) : (
            <div className="divide-y divide-[#F3EFE9]">
              {restaurants.map(r => {
                const status = r.billing_status ?? 'free';
                const plan = r.billing_plan ?? 'free';
                return (
                  <div key={r.id} className="px-6 py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#1C1917]">{r.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs font-semibold text-stone-500">{PLAN_LABEL[plan] ?? plan}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[status] ?? STATUS_BADGE.free}`}>
                          {status === 'active' ? 'Activo' : status === 'past_due' ? 'Vencido' : status === 'canceled' ? 'Cancelado' : 'Gratis'}
                        </span>
                      </div>
                      {r.billing_expires_at && (
                        <p className="text-xs text-stone-400 mt-0.5">Vence: {new Date(r.billing_expires_at).toLocaleDateString('es-MX')}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <button
                        onClick={() => generateLink(r.id)}
                        disabled={generating === r.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 disabled:opacity-50"
                      >
                        {generating === r.id ? 'Generando...' : 'Generar link Stripe →'}
                      </button>
                      {links[r.id] && (
                        <div className="flex gap-1 items-center">
                          <a href={links[r.id]} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 underline">Abrir link</a>
                          <button onClick={() => navigator.clipboard.writeText(links[r.id])} className="text-xs text-stone-400 hover:text-stone-700">Copiar</button>
                        </div>
                      )}
                    </div>
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
