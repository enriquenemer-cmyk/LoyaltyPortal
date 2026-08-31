'use client';
import { ArchiveBoxIcon, ExclamationTriangleIcon, QrCodeIcon, TruckIcon } from '@heroicons/react/24/outline';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { EmptyState } from '@/app/components/EmptyState';
import HorizontalBarList from '@/app/components/HorizontalBarList';
import UnitQRLabel from './UnitQRLabel';

type InventoryUnit = {
  id: string;
  product_id: string;
  order_number: string;
  weight: string;
  status: 'available' | 'retired';
  location: string | null;
  expires_at: string | null;
  received_at: string;
  retired_at: string | null;
  retired_by: string | null;
};

type ExpiringUnit = {
  id: string;
  product_id: string;
  product_name: string;
  unit: string;
  weight: string;
  order_number: string;
  location: string | null;
  expires_at: string;
};

type InventoryProduct = {
  id: string;
  restaurant_id: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  name: string;
  code: string | null;
  unit: string;
  description: string | null;
  current_stock: string;
  min_stock_alert: string;
  active: boolean;
  created_at: string;
};

type Supplier = {
  id: string;
  restaurant_id: string | null;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  product_count: number;
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

type Tab = 'productos' | 'movimientos' | 'proveedores' | 'resumen';

type InventorySummaryRow = {
  id: string;
  name: string;
  code: string | null;
  unit: string;
  current_stock: string;
  total_in: string;
  total_out: string;
};

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

// Strips floating-point rounding dust (e.g. 4.999999999999999) so quantities
// always render as the clean number a human actually entered.
function fmtQty(value: string | number): string {
  const n = Math.round(Number(value) * 1000) / 1000;
  return n.toString();
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
      {fmtQty(stock)} <span className="opacity-60 font-medium">· {label}</span>
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
                <span className="font-semibold">{p.name}</span>: {fmtQty(p.current_stock)} {p.unit} (mínimo {fmtQty(p.min_stock_alert)})
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

function ExpiringBanner({ units }: { units: ExpiringUnit[] }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return typeof window !== 'undefined' && !!sessionStorage.getItem('inv_expiring_dismissed'); }
    catch { return false; }
  });

  if (dismissed || units.length === 0) return null;

  function dismiss() {
    try { sessionStorage.setItem('inv_expiring_dismissed', '1'); } catch { /* ignore */ }
    setDismissed(true);
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex items-start justify-between gap-3 mb-6"
      style={{ boxShadow: '0 1px 2px rgba(217,119,6,0.05), 0 4px 12px rgba(217,119,6,0.08)' }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-lg leading-none shrink-0">⏳</span>
        <div className="min-w-0">
          <p className="font-bold text-amber-800 text-sm mb-1.5">
            {units.length === 1 ? '1 unidad por vencer' : `${units.length} unidades por vencer`}
          </p>
          <ul className="flex flex-col gap-1">
            {units.slice(0, 6).map((u) => {
              const isPast = u.expires_at < today;
              return (
                <li key={u.id} className="text-xs text-amber-700">
                  <span className="font-semibold">{u.product_name}</span>: {fmtQty(u.weight)} {u.unit} · Pedido #{u.order_number}
                  {' · '}
                  <span className={isPast ? 'font-bold text-red-600' : ''}>
                    {isPast ? 'venció' : 'vence'} {new Date(u.expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </span>
                  {u.location && ` · ${u.location}`}
                </li>
              );
            })}
            {units.length > 6 && (
              <li className="text-xs text-amber-600">y {units.length - 6} más...</li>
            )}
          </ul>
        </div>
      </div>
      <button
        onClick={dismiss}
        className="text-amber-400 hover:text-amber-600 transition-colors text-sm font-bold leading-none shrink-0"
        aria-label="Descartar alerta de vencimiento"
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
  suppliers,
  onClose,
  onCreated,
}: {
  restaurants: Restaurant[];
  suppliers: Supplier[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [restaurantId, setRestaurantId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [description, setDescription] = useState('');
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
          supplier_id: supplierId || null,
          name: name.trim(),
          code: code.trim() || null,
          unit: unit.trim() || 'unidad',
          description: description.trim() || null,
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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Proveedor</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            >
              <option value="">Sin proveedor asignado</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Código <span className="normal-case font-normal text-slate-400">(opcional)</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej. POL-001"
                className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
              />
            </div>
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

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Ficha técnica <span className="normal-case font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Pechuga de pollo congelada, importada, para asados"
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] resize-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Se muestra al escanear el QR de cada unidad.</p>
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
        <p className="text-sm text-slate-400 mb-4">{product.name} · stock actual: {fmtQty(product.current_stock)} {product.unit}</p>

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

function getAppOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://premia-tierra.vercel.app';
}

function UnitsEntryModal({
  product,
  onClose,
  onSaved,
}: {
  product: InventoryProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [orderNumber, setOrderNumber] = useState('');
  const [weights, setWeights] = useState<string[]>(['']);
  const [location, setLocation] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdUnits, setCreatedUnits] = useState<InventoryUnit[] | null>(null);

  function updateWeight(i: number, value: string) {
    setWeights((prev) => prev.map((w, idx) => (idx === i ? value : w)));
  }
  function addRow() {
    setWeights((prev) => [...prev, '']);
  }
  function removeRow(i: number) {
    setWeights((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    if (!orderNumber.trim()) {
      setError('El número de pedido es requerido');
      return;
    }
    const parsed = weights.map((w) => Number(w)).filter((w) => Number.isFinite(w) && w > 0);
    if (parsed.length === 0) {
      setError('Ingresa al menos un peso válido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id, order_number: orderNumber.trim(), weights: parsed,
          location: location.trim() || null,
          unit_price: unitPrice ? Number(unitPrice) : null,
          expires_at: expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar las unidades');
      setCreatedUnits(data.units);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar las unidades');
    } finally {
      setSaving(false);
    }
  }

  if (createdUnits) {
    const origin = getAppOrigin();
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-extrabold text-slate-800 mb-1">Etiquetas generadas</h2>
          <p className="text-sm text-slate-400 mb-4">
            Imprimí y pegá cada etiqueta en su bolsa/bulto correspondiente. Al escanearla con la cámara del celular, se abre la unidad para retirarla.
          </p>
          <div className="flex flex-wrap gap-4 justify-center py-4 print:py-0">
            {createdUnits.map((u) => (
              <UnitQRLabel
                key={u.id}
                url={`${origin}/admin/inventario/unidad/${u.id}`}
                productName={product.name}
                weight={u.weight}
                unit={product.unit}
                orderNumber={u.order_number}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 mt-6 print:hidden">
            <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
              Cerrar
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}
            >
              Imprimir etiquetas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-1">Entrada por unidades (QR)</h2>
        <p className="text-sm text-slate-400 mb-4">{product.name} · cada unidad con su peso real genera su propio QR</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Número de pedido</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Ej. 4821"
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Peso de cada unidad ({product.unit})
            </label>
            <div className="space-y-2">
              {weights.map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={w}
                    onChange={(e) => updateWeight(i, e.target.value)}
                    placeholder={`Bolsa ${i + 1}, ej. 4.5`}
                    autoFocus={i === weights.length - 1}
                    className="flex-1 px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                  />
                  {weights.length > 1 && (
                    <button onClick={() => removeRow(i)} className="text-slate-400 hover:text-red-500 text-sm px-2" aria-label="Quitar">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addRow}
              className="mt-2 text-xs font-bold text-[#F97316] hover:underline"
            >
              + Agregar otra unidad
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Ubicación de almacenamiento <span className="normal-case font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. Congelador 2 - Estante B"
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Si aún no sabes dónde va a quedar, déjalo vacío — se puede asignar después escaneando el QR ya colocado en su lugar.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Precio por {product.unit} de este pedido <span className="normal-case font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Ej. 12000"
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Se guarda para ver el historial de precios del proveedor a lo largo del tiempo.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Fecha de vencimiento <span className="normal-case font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Útil para perecederos — avisa antes de que se venza este pedido.
            </p>
          </div>
        </div>

        {error && <p className="text-red-600 text-xs font-semibold mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}
          >
            {saving ? 'Generando...' : `Generar ${weights.filter((w) => w).length || ''} etiqueta(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnitsListModal({
  product,
  onClose,
  onChanged,
}: {
  product: InventoryProduct;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/units?product_id=${product.id}&status=available`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUnits(data.units ?? []);
    } catch {
      setError('No se pudieron cargar las unidades.');
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  async function handleRetirar(unitId: string) {
    setRetiringId(unitId);
    setError('');
    try {
      const res = await fetch(`/api/admin/inventory/units/${unitId}/retirar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo retirar');
      await fetchUnits();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo retirar');
    } finally {
      setRetiringId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-1">Unidades disponibles</h2>
        <p className="text-sm text-slate-400 mb-4">{product.name} · retiro entero de una sola vez</p>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
        ) : units.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No hay unidades disponibles. Registrá una entrada por unidades primero.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {units.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-800">{u.weight} {product.unit}</p>
                  <p className="text-xs text-slate-400">Pedido #{u.order_number} · {new Date(u.received_at).toLocaleDateString('es-CO')}</p>
                  <p className="text-xs mt-0.5" style={{ color: u.location ? '#1a6b3c' : '#cbd5e1' }}>
                    {u.location ? `📍 ${u.location}` : 'Sin ubicación asignada'}
                  </p>
                </div>
                <button
                  onClick={() => handleRetirar(u.id)}
                  disabled={retiringId === u.id}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {retiringId === u.id ? 'Retirando…' : 'Retirar entera'}
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-600 text-xs font-semibold mt-3">{error}</p>}

        <div className="flex items-center justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function NewSupplierModal({
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
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) {
      setError('El nombre del proveedor es requerido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId || null,
          name: name.trim(),
          contact_name: contactName.trim() || null,
          contact_phone: contactPhone.trim() || null,
          contact_email: contactEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear proveedor');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proveedor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-4">Nuevo Proveedor</h2>

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
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Nombre del proveedor</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Distribuidora San Pedro"
              autoFocus
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Contacto (opcional)</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nombre de la persona de contacto"
              className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Teléfono</label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#E8E3DC] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-red-600 text-xs font-semibold mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}
          >
            {saving ? 'Guardando...' : 'Crear proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}

type PriceHistoryEntry = {
  id: string;
  product_id: string;
  product_name: string;
  unit: string;
  order_number: string;
  weight: string;
  unit_price: string;
  received_at: string;
};

function PriceHistoryModal({ supplier, onClose }: { supplier: Supplier; onClose: () => void }) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/inventory/suppliers/${supplier.id}/price-history`)
      .then((r) => r.json())
      .then((d) => setHistory(d.history ?? []))
      .finally(() => setLoading(false));
  }, [supplier.id]);

  // Group by product so a price jump is easy to spot per item
  const byProduct = useMemo(() => {
    const map = new Map<string, PriceHistoryEntry[]>();
    for (const entry of history) {
      const list = map.get(entry.product_id) ?? [];
      list.push(entry);
      map.set(entry.product_id, list);
    }
    return Array.from(map.entries()).map(([productId, entries]) => ({
      productId,
      productName: entries[0].product_name,
      unit: entries[0].unit,
      entries,
    }));
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold text-slate-800 mb-1">Historial de precios</h2>
        <p className="text-sm text-slate-400 mb-4">{supplier.name}</p>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>
        ) : byProduct.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">
            Sin precios registrados aún. Se guardan al ingresar unidades con el campo &quot;Precio&quot; lleno.
          </p>
        ) : (
          <div className="space-y-5">
            {byProduct.map(({ productId, productName, unit, entries }) => {
              const latest = Number(entries[0].unit_price);
              const previous = entries[1] ? Number(entries[1].unit_price) : null;
              const delta = previous != null ? latest - previous : null;
              return (
                <div key={productId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-bold text-slate-800">{productName}</p>
                    {delta != null && delta !== 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${delta > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toLocaleString('es-CO', { maximumFractionDigits: 0 })} / {unit}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {entries.slice(0, 8).map((e) => (
                      <div key={e.id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span className="text-slate-500">
                          {new Date(e.received_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })} · Pedido #{e.order_number}
                        </span>
                        <span className="font-bold text-slate-800">
                          ${Number(e.unit_price).toLocaleString('es-CO', { maximumFractionDigits: 0 })} / {unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">
            Cerrar
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [topConsumed, setTopConsumed] = useState<TopConsumedItem[]>([]);
  const [expiringUnits, setExpiringUnits] = useState<ExpiringUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('productos');
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState<Supplier | null>(null);
  const [movementModal, setMovementModal] = useState<{ product: InventoryProduct; type: 'entrada' | 'salida' } | null>(null);
  const [unitsEntryModal, setUnitsEntryModal] = useState<InventoryProduct | null>(null);
  const [unitsListModal, setUnitsListModal] = useState<InventoryProduct | null>(null);
  const [priceHistorySupplier, setPriceHistorySupplier] = useState<Supplier | null>(null);
  const [summary, setSummary] = useState<InventorySummaryRow[]>([]);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [savingCode, setSavingCode] = useState(false);

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

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/inventory/suppliers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuppliers(data.suppliers ?? []);
    } catch {
      // non-critical
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

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/inventory/summary');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSummary(data.summary ?? []);
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
        fetchSuppliers(),
        fetchSummary(),
        fetch('/api/restaurants')
          .then((r) => r.json())
          .then((d) => setRestaurants(d.restaurants ?? []))
          .catch(() => {}),
        fetch('/api/admin/inventory/top-consumed')
          .then((r) => r.json())
          .then((d) => setTopConsumed(d.items ?? []))
          .catch(() => {}),
        fetch('/api/admin/inventory/expiring?days=3')
          .then((r) => r.json())
          .then((d) => setExpiringUnits(d.units ?? []))
          .catch(() => {}),
      ]);
      setLoading(false);
    }
    loadAll();
  }, [fetchProducts, fetchMovements, fetchSuppliers, fetchSummary]);

  async function handleSaveCode(productId: string) {
    setSavingCode(true);
    try {
      const res = await fetch(`/api/admin/inventory/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim() || null }),
      });
      if (!res.ok) throw new Error();
      await fetchSummary();
      setEditingCodeId(null);
    } catch {
      setError('No se pudo guardar el código.');
    } finally {
      setSavingCode(false);
    }
  }

  const activeProducts = useMemo(() => {
    const active = products.filter((p) => p.active);
    return supplierFilter ? active.filter((p) => p.supplier_id === supplierFilter.id) : active;
  }, [products, supplierFilter]);

  const lowStockCount = useMemo(
    () => activeProducts.filter((p) => Number(p.current_stock) <= Number(p.min_stock_alert) && Number(p.min_stock_alert) > 0).length,
    [activeProducts]
  );

  const movementsToday = useMemo(() => movements.filter((m) => isToday(m.created_at)).length, [movements]);

  function refreshAfterMovement() {
    fetchProducts();
    fetchMovements();
  }

  function refreshAfterProductCreated() {
    fetchProducts();
    fetchSuppliers();
  }

  function exportSummaryCSV() {
    const headers = ['Producto', 'Código', 'Unidad', 'Total ingresado', 'Total salida', 'Stock actual'];
    const rows = summary.map((row) => [
      row.name,
      row.code ?? '',
      row.unit,
      fmtQty(row.total_in),
      fmtQty(row.total_out),
      fmtQty(row.current_stock),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-resumen-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowNewSupplier(true)}
              className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              <TruckIcon className="w-4 h-4" /> + Proveedor
            </button>
            <button
              onClick={() => setShowNewProduct(true)}
              className="flex items-center gap-2 font-bold px-5 py-3 rounded-xl text-sm transition-all"
              style={{ background: 'white', color: '#F97316', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            >
              + Nuevo Producto
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-10 py-6">
        {/* Low stock alert banner */}
        {!loading && <LowStockBanner products={activeProducts} />}
        {!loading && <ExpiringBanner units={expiringUnits} />}

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
          <button
            onClick={() => setTab('proveedores')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
              tab === 'proveedores'
                ? 'bg-[#F97316] text-white border-[#F97316] shadow-md shadow-orange-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#F97316] hover:text-[#F97316]'
            }`}
          >
            Proveedores
          </button>
          <button
            onClick={() => setTab('resumen')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all ${
              tab === 'resumen'
                ? 'bg-[#F97316] text-white border-[#F97316] shadow-md shadow-orange-200'
                : 'bg-white text-slate-600 border-slate-200 hover:border-[#F97316] hover:text-[#F97316]'
            }`}
          >
            Resumen
          </button>
        </div>

        {supplierFilter && tab === 'productos' && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className="text-slate-500">Mostrando productos de:</span>
            <span className="inline-flex items-center gap-2 font-bold px-3 py-1.5 rounded-full bg-orange-50 text-[#F97316] border border-orange-200">
              {supplierFilter.name}
              <button onClick={() => setSupplierFilter(null)} className="hover:text-red-500">✕</button>
            </span>
          </div>
        )}

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
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Proveedor</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Unidad</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Stock actual</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-orange-50/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-900">{p.name}</td>
                        <td className="px-5 py-4 text-slate-500">{p.supplier_name || '—'}</td>
                        <td className="px-5 py-4 text-slate-500">{p.unit}</td>
                        <td className="px-5 py-4">
                          <StockBadge stock={Number(p.current_stock)} minAlert={Number(p.min_stock_alert)} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
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
                            <button
                              onClick={() => setUnitsEntryModal(p)}
                              className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-200 text-[#F97316] bg-orange-50 hover:bg-orange-100 transition-colors"
                              title="Registrar entrada con QR por unidad (peso real de cada bulto)"
                            >
                              <QrCodeIcon className="w-3.5 h-3.5" /> Por unidades
                            </button>
                            <button
                              onClick={() => setUnitsListModal(p)}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                              Ver unidades
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
        ) : tab === 'proveedores' ? (
          suppliers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
              <EmptyState
                icon="clipboard"
                title="Sin proveedores registrados"
                description="Agrega tu primer proveedor para organizar los productos por quién los provee."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FFEDD5' }}>
                      <TruckIcon className="w-5 h-5" style={{ color: '#F97316' }} />
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                      {s.product_count} {s.product_count === 1 ? 'producto' : 'productos'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900">{s.name}</p>
                  {s.contact_name && <p className="text-xs text-slate-400 mt-0.5">{s.contact_name}</p>}
                  {(s.contact_phone || s.contact_email) && (
                    <p className="text-xs text-slate-400 mt-0.5">{[s.contact_phone, s.contact_email].filter(Boolean).join(' · ')}</p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => { setSupplierFilter(s); setTab('productos'); }}
                      className="flex-1 text-xs font-bold px-3 py-2 rounded-lg border border-orange-200 text-[#F97316] bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      Ver productos →
                    </button>
                    <button
                      onClick={() => setPriceHistorySupplier(s)}
                      className="flex-1 text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      Historial de precios
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'resumen' ? (
          summary.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm">
              <EmptyState
                icon="clipboard"
                title="Sin productos activos"
                description="Crea un producto para ver aquí su resumen de entradas y salidas."
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E8E3DC] flex justify-end">
                <button
                  onClick={exportSummaryCSV}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-200 text-[#F97316] bg-orange-50 hover:bg-orange-100 transition-colors"
                >
                  Exportar CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#FAFAF9] border-b border-[#E8E3DC]">
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Producto</th>
                      <th className="text-left px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Código</th>
                      <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Total ingresado</th>
                      <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Total salida</th>
                      <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase tracking-wider">Stock actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {summary.map((row) => (
                      <tr key={row.id} className="hover:bg-orange-50/40 transition-colors">
                        <td className="px-5 py-4 font-medium text-slate-900">{row.name}</td>
                        <td className="px-5 py-4">
                          {editingCodeId === row.id ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                autoFocus
                                type="text"
                                value={codeInput}
                                onChange={(e) => setCodeInput(e.target.value)}
                                placeholder="Ej. POL-001"
                                className="w-28 px-2 py-1 border border-[#E8E3DC] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                              />
                              <button
                                onClick={() => handleSaveCode(row.id)}
                                disabled={savingCode}
                                className="text-xs font-bold text-white px-2 py-1 rounded-lg disabled:opacity-50"
                                style={{ background: '#F97316' }}
                              >
                                ✓
                              </button>
                              <button onClick={() => setEditingCodeId(null)} className="text-xs text-slate-400 px-1">✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingCodeId(row.id); setCodeInput(row.code ?? ''); }}
                              className="text-xs font-mono px-2 py-1 rounded-lg border border-dashed transition-colors"
                              style={{ borderColor: row.code ? 'transparent' : '#D6D0C4', color: row.code ? '#1C1917' : '#a8a29e', background: row.code ? '#F5F5F4' : 'transparent' }}
                            >
                              {row.code || 'Asignar código'}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-emerald-700">+{fmtQty(row.total_in)} {row.unit}</td>
                        <td className="px-5 py-4 text-right font-semibold text-red-600">−{fmtQty(row.total_out)} {row.unit}</td>
                        <td className="px-5 py-4 text-right font-black text-slate-900">{fmtQty(row.current_stock)} {row.unit}</td>
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
          suppliers={suppliers}
          onClose={() => setShowNewProduct(false)}
          onCreated={refreshAfterProductCreated}
        />
      )}

      {showNewSupplier && (
        <NewSupplierModal
          restaurants={restaurants}
          onClose={() => setShowNewSupplier(false)}
          onCreated={fetchSuppliers}
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

      {unitsEntryModal && (
        <UnitsEntryModal
          product={unitsEntryModal}
          onClose={() => setUnitsEntryModal(null)}
          onSaved={refreshAfterMovement}
        />
      )}

      {unitsListModal && (
        <UnitsListModal
          product={unitsListModal}
          onClose={() => setUnitsListModal(null)}
          onChanged={refreshAfterMovement}
        />
      )}

      {priceHistorySupplier && (
        <PriceHistoryModal
          supplier={priceHistorySupplier}
          onClose={() => setPriceHistorySupplier(null)}
        />
      )}
    </div>
  );
}
