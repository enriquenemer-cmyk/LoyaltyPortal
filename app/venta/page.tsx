'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type Employee = {
  id: string;
  full_name: string;
  position: string | null;
};

type Product = {
  id: string;
  name: string;
  unit: string;
  current_stock: string;
  sale_price: string;
};

type CartLine = { product: Product; quantity: number };

type SaleReceipt = {
  id: string;
  total_amount: number;
  payment_method: string;
  items: { product_name: string; unit: string; quantity: number; subtotal: number }[];
};

type Phase = 'pin' | 'pos';

const MAX_PIN_LENGTH = 6;
const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];

function formatCurrency(n: number): string {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function getAppOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://premia-tierra.vercel.app';
}

function GameQR({ url, size = 140 }: { url: string; size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      const QRCodeStyling = (await import('qr-code-styling')).default;
      if (cancelled || !container) return;
      container.innerHTML = '';
      const qr = new QRCodeStyling({
        width: size,
        height: size,
        type: 'svg',
        data: url,
        dotsOptions: { type: 'square', color: '#111111' },
        cornersSquareOptions: { type: 'square', color: '#111111' },
        cornersDotOptions: { type: 'square', color: '#111111' },
        backgroundOptions: { color: '#ffffff' },
        qrOptions: { errorCorrectionLevel: 'M' },
      });
      if (!cancelled) qr.append(container);
    })();

    return () => { cancelled = true; };
  }, [url, size]);

  return <div ref={containerRef} style={{ width: size, height: size }} className="mx-auto" />;
}

export default function VentaPage() {
  const [phase, setPhase] = useState<Phase>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [charging, setCharging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [gameBundle, setGameBundle] = useState<{ id: string; name: string } | null>(null);

  const resetToPin = useCallback(() => {
    setPin('');
    setPinError(null);
    setEmployee(null);
    setProducts([]);
    setCart([]);
    setReceipt(null);
    setPhase('pin');
  }, []);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetch('/api/pos/products');
      const data = await res.json();
      if (res.ok) setProducts(data.products ?? []);
    } catch {
      // ignore
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const loadTodaySales = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/sale');
      const data = await res.json();
      if (res.ok) {
        const total = (data.sales ?? [])
          .filter((s: { cancelled_at: string | null }) => !s.cancelled_at)
          .reduce((sum: number, s: { total_amount: string }) => sum + Number(s.total_amount), 0);
        setTodayTotal(total);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadGameBundle = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/active-game-bundle');
      const data = await res.json();
      if (res.ok) setGameBundle(data.bundle ?? null);
    } catch {
      // no game link on the receipt if this fails — non-critical
    }
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/employees/me');
      if (res.ok) {
        const data = await res.json();
        if (data.employee) {
          setEmployee(data.employee);
          setPhase('pos');
        }
      }
    } catch {
      // stays on pin screen
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (phase === 'pos') {
      loadProducts();
      loadTodaySales();
      loadGameBundle();
    }
  }, [phase, loadProducts, loadTodaySales, loadGameBundle]);

  function handleDigit(d: string) {
    if (pinLoading) return;
    setPinError(null);
    setPin((prev) => (prev.length < MAX_PIN_LENGTH ? prev + d : prev));
  }

  function handleBackspace() {
    if (pinLoading) return;
    setPin((prev) => prev.slice(0, -1));
  }

  async function handleConfirmPin() {
    if (pin.length < 4) {
      setPinError('El PIN debe tener al menos 4 dígitos.');
      return;
    }
    setPinLoading(true);
    setPinError(null);
    try {
      const res = await fetch('/api/employees/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error ?? 'PIN incorrecto.');
        setPin('');
      } else {
        setPin('');
        await checkSession();
      }
    } catch {
      setPinError('Error de conexión. Intenta de nuevo.');
    } finally {
      setPinLoading(false);
    }
  }

  function addToCart(product: Product) {
    setError(null);
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  }

  const total = useMemo(
    () => cart.reduce((sum, l) => sum + Number(l.product.sale_price) * l.quantity, 0),
    [cart]
  );

  async function handleCharge() {
    if (cart.length === 0) return;
    setCharging(true);
    setError(null);
    try {
      const res = await fetch('/api/pos/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: paymentMethod,
          items: cart.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo registrar la venta.');
        return;
      }
      setReceipt(data.sale);
      setCart([]);
      loadProducts();
      loadTodaySales();
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCharging(false);
    }
  }

  async function handleCancelSale() {
    if (!receipt) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/pos/sale/${receipt.id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo anular la venta.');
        return;
      }
      setReceipt(null);
      loadProducts();
      loadTodaySales();
    } catch {
      setError('Error de conexión.');
    } finally {
      setCancelling(false);
    }
  }

  if (phase === 'pin') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 45%, #1a6b3c 70%, #7c3aed 100%)' }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-3xl p-6 sm:p-8"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
          >
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
                style={{ background: 'rgba(5,150,105,0.1)', color: '#065f46' }}
              >
                Punto de Venta
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">Ingresa tu PIN</h1>
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full transition-all"
                  style={{
                    background: i < pin.length ? '#059669' : '#e5e7eb',
                    transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {pinError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3 text-center">
                {pinError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  disabled={pinLoading}
                  className="aspect-square rounded-2xl text-2xl font-bold text-[#1C1917] bg-stone-100 hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={pinLoading}
                className="aspect-square rounded-2xl text-lg font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={pinLoading}
                className="aspect-square rounded-2xl text-2xl font-bold text-[#1C1917] bg-stone-100 hover:bg-emerald-50 active:scale-95 transition-all disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleConfirmPin}
                disabled={pinLoading || pin.length < 4}
                className="aspect-square rounded-2xl text-lg font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center"
              >
                {pinLoading ? '…' : '✓'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E8E3DC] px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-sm font-black text-[#1C1917]">{employee?.full_name}</p>
          <p className="text-xs text-stone-400">Ventas de hoy: <span className="font-bold text-emerald-600">{formatCurrency(todayTotal)}</span></p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/comanda" target="_blank" className="text-xs font-semibold text-orange-600 hover:underline">
            Abrir comanda
          </Link>
          <button
            onClick={resetToPin}
            className="text-xs font-semibold text-stone-400 hover:text-stone-600"
          >
            Cambiar de usuario
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Product grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {productsLoading ? (
            <div className="py-10 text-center text-sm text-stone-400">Cargando artículos...</div>
          ) : products.length === 0 ? (
            <div className="py-10 text-center text-sm text-stone-400 max-w-sm mx-auto">
              No hay artículos disponibles para vender. Un administrador debe asignarles un precio de venta en Inventario.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((p) => {
                const stock = Number(p.current_stock);
                const outOfStock = stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => !outOfStock && addToCart(p)}
                    disabled={outOfStock}
                    className="text-left bg-white border border-[#E8E3DC] rounded-2xl p-4 hover:border-emerald-400 hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <p className="text-sm font-bold text-[#1C1917] leading-snug">{p.name}</p>
                    <p className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(Number(p.sale_price))}</p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      {outOfStock ? 'Sin stock' : `Disponible: ${stock} ${p.unit}`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart panel */}
        <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-[#E8E3DC] flex flex-col">
          <div className="px-4 py-3 border-b border-[#E8E3DC]">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Carrito</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {cart.length === 0 ? (
              <p className="text-sm text-stone-300 text-center py-8">Toca un artículo para agregarlo</p>
            ) : (
              <div className="space-y-2">
                {cart.map((line) => (
                  <div key={line.product.id} className="flex items-center gap-2 bg-[#FAFAF9] rounded-xl px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#1C1917] truncate">{line.product.name}</p>
                      <p className="text-[10px] text-stone-400">{formatCurrency(Number(line.product.sale_price))} c/u</p>
                    </div>
                    <button
                      onClick={() => updateQuantity(line.product.id, line.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-stone-200 text-stone-600 font-bold text-sm flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-xs font-bold w-6 text-center">{line.quantity}</span>
                    <button
                      onClick={() => updateQuantity(line.product.id, line.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-stone-200 text-stone-600 font-bold text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="text-xs font-black text-[#1C1917] w-16 text-right">
                      {formatCurrency(Number(line.product.sale_price) * line.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#E8E3DC] p-4 space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex-1 text-xs font-bold py-2 rounded-xl border transition-colors ${
                    paymentMethod === m.value
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-stone-500 border-[#E8E3DC] hover:bg-stone-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total</span>
              <span className="text-2xl font-black text-[#1C1917]">{formatCurrency(total)}</span>
            </div>

            <button
              onClick={handleCharge}
              disabled={cart.length === 0 || charging}
              className="w-full py-4 rounded-2xl text-lg font-black text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-40"
              style={{ boxShadow: '0 8px 24px rgba(5,150,105,0.35)' }}
            >
              {charging ? 'Cobrando…' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>

      {/* Receipt confirmation overlay */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
            <div
              className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(5,150,105,0.12)' }}
            >
              <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-[#1C1917]">Venta registrada</h2>
            <p className="text-3xl font-black text-emerald-600 mt-2">{formatCurrency(receipt.total_amount)}</p>
            <div className="text-left mt-4 mb-6 space-y-1">
              {receipt.items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-stone-500">
                  <span>{it.quantity} × {it.product_name}</span>
                  <span className="font-semibold">{formatCurrency(it.subtotal)}</span>
                </div>
              ))}
            </div>

            {gameBundle && (
              <div className="rounded-2xl p-4 mb-5" style={{ background: 'linear-gradient(135deg,#FFF7ED,#FFEDD5)', border: '1px solid #FDBA74' }}>
                <p className="text-xs font-black text-orange-700 uppercase tracking-wide mb-3">¡Escanea y juega tu premio!</p>
                <GameQR url={`${getAppOrigin()}/jugar/${gameBundle.id}`} />
                <a
                  href={`/jugar/${gameBundle.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block mt-3 text-xs font-bold text-orange-600 hover:underline"
                >
                  O abre el juego en este dispositivo →
                </a>
              </div>
            )}

            <button
              onClick={() => setReceipt(null)}
              className="w-full py-3 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-colors mb-2"
            >
              Nueva venta
            </button>
            <button
              onClick={handleCancelSale}
              disabled={cancelling}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Anulando…' : '¿Te equivocaste? Anular esta venta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
