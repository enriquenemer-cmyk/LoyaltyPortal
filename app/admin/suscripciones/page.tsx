'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type VIPCustomer = {
  phone: string;
  full_name: string | null;
  tier: string;
  total_points: number;
  updated_at: string;
};

function SuscripcionesContent() {
  const params = useSearchParams();
  const success = params.get('success');
  const cancelled = params.get('cancelled');

  const [vips, setVips] = useState<VIPCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [link, setLink] = useState('');

  const hasStripe = true; // Will fail gracefully if not configured

  useEffect(() => {
    fetch('/api/customer-points')
      .then(r => r.json())
      .then(d => {
        const gold = (d.points ?? []).filter((p: VIPCustomer) => p.tier === 'gold');
        setVips(gold);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSendCheckout(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setLink('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      });
      const d = await res.json();
      if (d.url) {
        setLink(d.url);
      } else {
        alert(d.error ?? 'Error al generar link');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              📱 Suscripciones
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Suscripciones</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Clientes VIP pagan $99/mes por puntos dobles y acceso exclusivo</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold">
            ✓ Suscripción VIP activada exitosamente. El cliente ahora tiene nivel Oro automáticamente.
          </div>
        )}
        {cancelled && (
          <div className="mb-6 p-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-600 text-sm">
            El pago fue cancelado.
          </div>
        )}

        {/* Config notice */}
        {!process.env.NEXT_PUBLIC_APP_URL && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
            <strong>Configuración requerida:</strong> agrega <code className="bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code>,
            <code className="bg-amber-100 px-1 rounded mx-1">STRIPE_WEBHOOK_SECRET</code> y
            <code className="bg-amber-100 px-1 rounded">STRIPE_VIP_PRICE_ID</code> en tus variables de entorno.
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🥇', title: 'Nivel Oro automático', desc: 'Al suscribirse, el cliente sube a Gold inmediatamente' },
            { icon: '2×', title: 'Puntos dobles', desc: 'Cada visita acumula el doble de puntos durante la suscripción' },
            { icon: '🎁', title: 'Premios exclusivos', desc: 'Acceso a campañas y premios solo para miembros VIP' },
          ].map(b => (
            <div key={b.title} className="bg-white rounded-2xl border border-[#E8E3DC] p-4">
              <div className="text-2xl mb-2">{b.icon}</div>
              <p className="font-semibold text-sm text-[#1C1917] mb-1">{b.title}</p>
              <p className="text-xs text-stone-500">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Generate checkout link */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] p-6 mb-6">
          <h2 className="text-sm font-bold text-[#1C1917] mb-4">Generar link de pago para un cliente</h2>
          <form onSubmit={handleSendCheckout} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Teléfono</label>
              <input
                value={phone} onChange={e => setPhone(e.target.value)} required
                placeholder="5512345678"
                className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm w-44 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">Email</label>
              <input
                value={email} onChange={e => setEmail(e.target.value)} type="email" required
                placeholder="cliente@email.com"
                className="border border-[#E8E3DC] rounded-xl px-3 py-2 text-sm w-52 focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <button
              type="submit" disabled={sending}
              className="px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60"
              style={{ background: '#2563EB' }}
            >
              {sending ? 'Generando...' : 'Generar link Stripe →'}
            </button>
          </form>
          {link && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-semibold text-blue-700 mb-1">Link de pago (válido 24h):</p>
              <div className="flex items-center gap-2">
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline break-all">{link}</a>
                <button
                  onClick={() => navigator.clipboard.writeText(link)}
                  className="shrink-0 text-xs bg-white border border-blue-200 px-2 py-1 rounded-lg text-blue-700 hover:bg-blue-50"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* VIP customers */}
        <div className="bg-white rounded-2xl border border-[#E8E3DC] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8E3DC] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1C1917]">Clientes con nivel Oro (VIP)</h2>
            <span className="text-2xl font-extrabold text-[#1C1917] tabular-nums">{vips.length}</span>
          </div>
          {loading ? (
            <div className="py-10 text-center text-stone-400 text-sm">Cargando...</div>
          ) : vips.length === 0 ? (
            <div className="py-10 text-center text-stone-400 text-sm">Aún no hay clientes VIP. Comparte el link de pago con tus mejores clientes.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E8E3DC] text-left text-[10px] font-bold uppercase tracking-widest text-stone-400">
                    <th className="px-6 py-3">Teléfono</th>
                    <th className="px-6 py-3">Nombre</th>
                    <th className="px-6 py-3">Puntos</th>
                    <th className="px-6 py-3">Última actualización</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EFE9]">
                  {vips.map(v => (
                    <tr key={v.phone} className="hover:bg-amber-50/30">
                      <td className="px-6 py-3 font-mono text-xs">{v.phone}</td>
                      <td className="px-6 py-3 font-medium">{v.full_name ?? '—'}</td>
                      <td className="px-6 py-3 tabular-nums font-bold text-amber-600">{v.total_points.toLocaleString()}</td>
                      <td className="px-6 py-3 text-stone-400 text-xs">
                        {new Date(v.updated_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
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

export default function SuscripcionesPage() {
  return (
    <Suspense>
      <SuscripcionesContent />
    </Suspense>
  );
}
