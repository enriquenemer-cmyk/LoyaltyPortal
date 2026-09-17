'use client';
import { useEffect, useState } from 'react';

type Product = { id: string; name: string; unit: string; current_stock: string; sale_price: string; product_type: 'inventory' | 'recipe' };
type CartLine = { product: Product; quantity: number };

function fmt(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export default function PedidosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState<{ id: string; total_amount: number } | null>(null);

  useEffect(() => {
    fetch('/api/pedidos/productos')
      .then((r) => r.json())
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setError('No se pudo cargar el menú. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  }, []);

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === p.id);
      if (existing) return prev.map((l) => (l.product.id === p.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { product: p, quantity: 1 }];
    });
  }
  function updateQty(id: string, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.product.id !== id));
      return;
    }
    setCart((prev) => prev.map((l) => (l.product.id === id ? { ...l, quantity: qty } : l)));
  }

  const total = cart.reduce((sum, l) => sum + Number(l.product.sale_price) * l.quantity, 0);

  async function enviarPedido() {
    setError('');
    if (cart.length === 0) { setError('Agrega al menos un artículo.'); return; }
    if (!name.trim()) { setError('Ingresa tu nombre.'); return; }
    if (!phone.trim()) { setError('Ingresa tu teléfono.'); return; }
    if (deliveryType === 'delivery' && !address.trim()) { setError('Ingresa la dirección de entrega.'); return; }

    setSending(true);
    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          delivery_type: deliveryType,
          address: address.trim() || null,
          notes: notes.trim() || null,
          items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity, product_type: l.product.product_type })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el pedido');
      setConfirmed({ id: data.order.id, total_amount: data.order.total_amount });
      setCart([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el pedido');
    } finally {
      setSending(false);
    }
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-xl">
          <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center bg-emerald-100">
            <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-[#1C1917]">¡Pedido enviado!</h2>
          <p className="text-sm text-stone-500 mt-2">
            Folio #{confirmed.id.slice(0, 8).toUpperCase()} — Total {fmt(confirmed.total_amount)}
          </p>
          <p className="text-xs text-stone-400 mt-3">
            El restaurante confirmará tu pedido en breve. Te avisaremos cuando esté listo.
          </p>
          <button
            onClick={() => setConfirmed(null)}
            className="mt-6 w-full py-3 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700"
          >
            Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="bg-white border-b border-[#E8E3DC] px-4 py-4 text-center">
        <h1 className="text-xl font-black text-[#1C1917]">🛍️ Pide en línea</h1>
        <p className="text-xs text-stone-400 mt-0.5">Para llevar o a domicilio</p>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-40">
        {loading ? (
          <div className="py-10 text-center text-sm text-stone-400">Cargando menú...</div>
        ) : products.length === 0 ? (
          <div className="py-10 text-center text-sm text-stone-400">No hay artículos disponibles por ahora.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="text-left bg-white border border-[#E8E3DC] rounded-2xl p-4 hover:border-emerald-400 hover:shadow-md transition-all"
              >
                <p className="text-sm font-bold text-[#1C1917] leading-snug">
                  {p.product_type === 'recipe' && <span className="mr-1">🍳</span>}{p.name}
                </p>
                <p className="text-lg font-black text-emerald-600 mt-1">{fmt(Number(p.sale_price))}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E3DC] p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-2xl mx-auto">
            <div className="space-y-1.5 mb-3 max-h-32 overflow-y-auto">
              {cart.map((l) => (
                <div key={l.product.id} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 font-semibold truncate">{l.product.name}</span>
                  <button onClick={() => updateQty(l.product.id, l.quantity - 1)} className="w-6 h-6 rounded-lg bg-stone-100 font-bold">−</button>
                  <span className="w-5 text-center font-bold">{l.quantity}</span>
                  <button onClick={() => updateQty(l.product.id, l.quantity + 1)} className="w-6 h-6 rounded-lg bg-stone-100 font-bold">+</button>
                  <span className="w-16 text-right font-black">{fmt(Number(l.product.sale_price) * l.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="text-xs px-3 py-2 rounded-xl border border-[#E8E3DC]" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Tu teléfono" className="text-xs px-3 py-2 rounded-xl border border-[#E8E3DC]" />
            </div>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setDeliveryType('pickup')} className={`flex-1 text-xs font-bold py-2 rounded-xl border ${deliveryType === 'pickup' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-[#E8E3DC] text-stone-500'}`}>Para llevar</button>
              <button onClick={() => setDeliveryType('delivery')} className={`flex-1 text-xs font-bold py-2 rounded-xl border ${deliveryType === 'delivery' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-[#E8E3DC] text-stone-500'}`}>A domicilio</button>
            </div>
            {deliveryType === 'delivery' && (
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección de entrega" className="w-full text-xs px-3 py-2 rounded-xl border border-[#E8E3DC] mb-2" />
            )}
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" className="w-full text-xs px-3 py-2 rounded-xl border border-[#E8E3DC] mb-2" />

            {error && <p className="text-red-600 text-xs font-semibold mb-2">{error}</p>}

            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold text-stone-500 uppercase">Total</span>
              <span className="text-xl font-black">{fmt(total)}</span>
            </div>
            <button
              onClick={enviarPedido}
              disabled={sending}
              className="w-full py-3.5 rounded-2xl text-base font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            >
              {sending ? 'Enviando…' : 'Enviar pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
