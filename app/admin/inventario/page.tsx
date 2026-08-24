'use client';
import { ArchiveBoxIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { EmptyState } from '@/app/components/EmptyState';
import HorizontalBarList from '@/app/components/HorizontalBarList';

type InventoryProduct = {
  id: string;
  restaurant_id: string | null;
  name: string;
  unit: string;
  current_stock: string;
  min_stock_alert: string;
  active: boolean;
  created_at: string;
};

type InventoryMovement = {
  id: string;
  product_id: string;
  product_name: string;
  type: 'entrada' | 'salida';
  quantity: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type Restaurant = { id: string; name: string };

type TopConsumedItem = {
  product_id: string;
  name: string;
  total_quantity: number;
  percentage: number;
};

type Tab = 'productos' | 'movimientos';

function formatDateTime(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function StockBadge({ stock, minAlert }: { stock: number; minAlert: number }) {
  let cls = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  let label = 'OK';
  if (minAlert > 0 && stock <= minAlert) {
    cls = 'bg-red-50 text-red-700 border-red-200';
    label = 'Bajo';
  } else if (minAlert > 0 && stock <= minAlert * 1.5) {
    cls = 'bg-yellow-50 text-yellow-700 border-yellow-200';
    label = 'Cerca del límite';
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {stock} <span className="opacity-60 font-medium">· {label}</span>
    </span>
  );
}

function LowStockBanner({ products }: { products: InventoryProduct[] }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return typeof window !== 'undefined' && !!sessionStorage.getItem('inv_low_stock_dismissed'); }
    catch { return false; }
  });

  const lowStockProducts = products.filter(
    (p) => p.active && Number(p.min_stock_alert) > 0 && Number(p.current_stock) <= Number(p.min_stock_alert)
  );

  if (dismissed || lowStockProducts.length === 0) return null;

  function dismiss() {
    try { sessionStorage.setItem('inv_low_stock_dismissed', '1'); } catch { /* ignore */ }
    setDismissed(true);
  }

  return (
    <div
      className="rounded-2xl border border-red-200 bg-red-50 p-5 flex items-start justify-between gap-3 mb-6"
      style={{ boxShadow: '0 1px 2px rgba(220,38,38,0.05), 0 4px 12px rgba(220,38,38,0.08)' }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-lg leading-none shrink-0"><ExclamationTriangleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="font-bold text-red-800 text-sm mb-1.5">
            {lowStockProducts.length === 1
              ? '1 producto con stock bajo'
              : `${lowStockProducts.length} productos con stock bajo`}
          </p>
          <ul className="flex flex-col gap-1">
            {lowStockProducts.slice(0, 6).map((p) => (
              <li key={p.id} className="text-xs text-red-700">
                <span className="font-semibold">{p.name}</span>: {p.current_stock} {p.unit} (mínimo {p.min_stock_alert})
              </li>
            ))}
            {lowStockProducts.length > 6 && (
              <li className="text-xs text-red-500">y {lowStockProducts.length - 6} más...</li>
            )}
          </ul>
        </div>
      </div>
      <button
        onClick={dismiss}
        className="text-red-400 hover:text-red-600 transition-colors text-sm font-bold leading-none shrink-0"
        aria-label="Descartar alerta de stock bajo"
      >
        ✕
      </button>
    </div>
  );
}

function MovementTypeBadge({ type }: { type: 'entrada' | 'salida' }) {
  if (type === 'entrada') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
        + Entrada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
      − Salida
    </span>
  );
}

function NewProductModal({
  restaurants,
  onClose,
  onCreated,
}: {
  restaurants: Restaurant[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [restaurantId, setRestaurantId] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [minStockAlert, setMinStockAlert] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('El nombre es requerido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId || null,
          name: name.trim(),
          unit: unit.trim() || 'unidad',
          min_stock_alert: Number(minStockAlert) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear producto');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear producto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-extrabold text-slate-800 mb-4">Nuevo Producto</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Restaurante</label>
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            >
              <option value="">Sin restaurante específico</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Servilletas"
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Unidad</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="unidad, kg, lt..."
                className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Stock mínimo</label>
              <input
                type="number"
                min="0"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-xs font-semibold mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}
          >
            {saving ? 'Guardando...' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MovementModal({
  product,
  type,
  onClose,
  onSaved,
}: {
  product: InventoryProduct;
  type: 'entrada' | 'salida';
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, type, quantity: qty, note: note.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar movimiento');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar movimiento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-extrabold text-slate-800 mb-1">
          {type === 'entrada' ? '+ Entrada' : '− Salida'}
        </h2>
        <p className="text-sm text-slate-400 mb-4">{product.name} · stock actual: {product.current_stock} {product.unit}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cantidad</label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Motivo, proveedor, etc."
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-xs font-semibold mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: type === 'entrada' ? 'linear-gradient(135deg,#059669,#0d9488)' : 'linear-gradient(135deg,#dc2626,#ea580c)' }}
          >
            {saving ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventarioPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [topConsumed, setTopConsumed] = useState<TopConsumedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('productos');
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [movementModal, setMovementModal] = useState<{ product: InventoryProduct; type: 'entrada' | 'salida' } | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/inventory/products');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProducts(data.products ?? []);
    } catch {
      setError('No se pudieron cargar los productos.');
    }
  }, []);

  const fetchMovements = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/inventory/movements');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMovements(data.movements ?? []);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        fetchMovements(),
        fetch('/api/restaurants')
          .then((r) => r.json())
          .then((d) => setRestaurants(d.restaurants ?? []))
          .catch(() => {}),
        fetch('/api/admin/inventory/top-consumed')
          .then((r) => r.json())
          .then((d) => setTopConsumed(d.items ?? []))
          .catch(() => {}),
      ]);
      setLoading(false);
    }
    loadAll();
  }, [fetchProducts, fetchMovements]);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);

  const lowStockCount = useMemo(
    () => activeProducts.filter((p) => Number(p.current_stock) <= Number(p.min_stock_alert) && Number(p.min_stock_alert) > 0).length,
    [activeProducts]
  );

  const movementsToday = useMemo(() => movements.filter((m) => isToday(m.created_at)).length, [movements]);

  function refreshAfterMovement() {
    fetchProducts();
    fetchMovements();
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-7xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}
            >
              <ArchiveBoxIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Control de Stock
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Inventario</h1>
            <p className="text-orange-200/70 mt-1.5 text-sm">Control de productos: entradas y consumo</p>
          </div>
          <button
            onClick={() => setShowNewProduct(true)}
            className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all"
            style={{ background: 'white', color: '#F97316', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          >
            + Nuevo Producto
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">
        {/* Low stock alert banner */}
        {!loading && <LowStockBanner products={activeProducts} />}

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Productos activos', value: activeProducts.length, icon: '', borderColor: '#F97316', bgColor: '#FFEDD5', numColor: '#F97316' },
            { label: 'Stock bajo', value: lowStockCount, icon: '', borderColor: '#dc2626', bgColor: '#fee2e2', numColor: '#dc2626' },
            { label: 'Movimientos hoy', value: movementsToday, icon: '', borderColor: '#0d9488', bgColor: '#ccfbf1', numColor: '#0d9488' },
          ].map(({ label, value, icon, borderColor, bgColor, numColor }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-[#E8E3DC] border-l-4 p-5 flex items-center gap-4"
              style={{ borderLeftColor: borderColor, boxShadow: '0 1px 2px rgba(28,25,23,0.04), 0 4px 16px rgba(28,25,23,0.06)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl" style={{ backgroundColor: bgColor }}>
                {icon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-3xl font-extrabold" style={{ color: numColor }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top 5 productos más consumidos */}
        {!loading && (
          <div className="mb-8">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Top 5 productos más consumidos (últimos 30 días)</p>
            <HorizontalBarList
              items={topConsumed.map((i) => ({ label: i.name, value: i.total_quantity, percentage: i.percentage }))}
              emptyMessage="Sin movimientos de salida en los últimos 30 días."
              barColor="linear-gradient(90deg, #dc2626, #ea580c)"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <button
            onClick={() => setTab('productos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
              tab === 'productos'
                ? 'bg-[#F97316] text-white border-[#F97316] shadow-md shadow-orange-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#F97316] hover:text-[#F97316]'
            }`}
          >
            Productos
          </button>
          <button
            onClick={() => setTab('movimientos')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
              tab === 'movimientos'
                ? 'bg-[#F97316] text-white border-[#F97316] shadow-md shadow-orange-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#F97316] hover:text-[#F97316]'
            }`}
          >
            Historial de movimientos
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-10 text-center text-sm text-slate-400">
            Cargando...
          </div>
        ) : tab === 'productos' ? (
          activeProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
              <EmptyState
                icon="clipboard"
                title="Sin productos en inventario"
                description="Agrega tu primer producto para empezar a controlar entradas y salidas."
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Producto</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Unidad</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Stock actual</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-orange-50/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-900">{p.name}</td>
                        <td className="px-5 py-4 text-slate-500">{p.unit}</td>
                        <td className="px-5 py-4">
                          <StockBadge stock={Number(p.current_stock)} minAlert={Number(p.min_stock_alert)} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setMovementModal({ product: p, type: 'entrada' })}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                            >
                              + Entrada
                            </button>
                            <button
                              onClick={() => setMovementModal({ product: p, type: 'salida' })}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              − Salida
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : movements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
            <EmptyState
              icon="clipboard"
              title="Sin movimientos registrados"
              description="Las entradas y salidas de inventario aparecerán aquí."
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Tipo</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Producto</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Cantidad</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Nota</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Quién</th>
                    <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Cuándo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-orange-50/40 transition-colors">
                      <td className="px-5 py-4"><MovementTypeBadge type={m.type} /></td>
                      <td className="px-5 py-4 font-medium text-slate-900">{m.product_name}</td>
                      <td className="px-5 py-4 text-slate-600">{m.quantity}</td>
                      <td className="px-5 py-4 text-slate-400 text-xs">{m.note || '—'}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs">{m.created_by || '—'}</td>
                      <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">{formatDateTime(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showNewProduct && (
        <NewProductModal
          restaurants={restaurants}
          onClose={() => setShowNewProduct(false)}
          onCreated={fetchProducts}
        />
      )}

      {movementModal && (
        <MovementModal
          product={movementModal.product}
          type={movementModal.type}
          onClose={() => setMovementModal(null)}
          onSaved={refreshAfterMovement}
        />
      )}
    </div>
  );
}
