'use client';
import { useEffect, useState } from 'react';

type Supplier = { id: string; name: string };
type OrderItem = { product_name: string; quantity: number; unit: string; unit_cost: number };
type PurchaseOrder = {
  id: string; supplier_name?: string; supplier_name_joined?: string; expected_date?: string;
  status: string; notes?: string; items: OrderItem[]; total: string; created_at: string;
};

const UNITS = ['pza', 'kg', 'g', 'l', 'ml', 'caja', 'bolsa', 'rollo'];

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: '#fef9c3', color: '#ca8a04', label: '⏳ Pendiente' },
  recibida:  { bg: '#dcfce7', color: '#16a34a', label: '✅ Recibida' },
  cancelada: { bg: '#fee2e2', color: '#dc2626', label: '✕ Cancelada' },
};

export default function OrdenesCompraPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplier_id: '', supplier_name: '', expected_date: '', notes: '',
    items: [{ product_name: '', quantity: 1, unit: 'pza', unit_cost: 0 }],
  });

  async function load() {
    const [o, s] = await Promise.all([
      fetch('/api/admin/ordenes-compra').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/proveedores').then(r => r.ok ? r.json() : []),
    ]);
    setOrders(o);
    setSuppliers(s);
  }

  useEffect(() => { load(); }, []);

  function addItem() { setForm(f => ({ ...f, items: [...f.items, { product_name: '', quantity: 1, unit: 'pza', unit_cost: 0 }] })); }
  function removeItem(i: number) { setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) })); }
  function updateItem(i: number, key: string, val: string | number) {
    setForm(f => { const items = [...f.items]; items[i] = { ...items[i], [key]: val }; return { ...f, items }; });
  }

  const total = form.items.reduce((s, i) => s + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.unit_cost)) || 0), 0);

  async function save() {
    if (!form.supplier_name && !form.supplier_id) return;
    setSaving(true);
    await fetch('/api/admin/ordenes-compra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        supplier_name: form.supplier_name || suppliers.find(s => s.id === form.supplier_id)?.name,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ supplier_id: '', supplier_name: '', expected_date: '', notes: '', items: [{ product_name: '', quantity: 1, unit: 'pza', unit_cost: 0 }] });
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/admin/ordenes-compra', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  const inputStyle = { width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: 12, fontWeight: 700 as const, color: '#374151', display: 'block' as const, marginBottom: 4 };

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>Órdenes de Compra</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Genera órdenes a proveedores y confírmalas al recibirlas</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ padding: '8px 18px', border: '2px solid #111', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>+ Nueva orden</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {orders.map(o => {
          const st = STATUS_STYLE[o.status] ?? STATUS_STYLE.pendiente;
          const supplierName = o.supplier_name_joined ?? o.supplier_name ?? '—';
          return (
            <div key={o.id} style={{ background: 'white', border: '2px solid #111', borderRadius: 12, padding: 18, boxShadow: '3px 3px 0 #111' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15 }}>🏪 {supplierName}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    OC #{o.id.slice(0, 8).toUpperCase()}
                    {o.expected_date ? ` · Esperada: ${o.expected_date}` : ''}
                    {' · '}{new Date(o.created_at).toLocaleDateString('es-MX')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: st.bg, color: st.color, borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>{fmt(parseFloat(o.total))}</span>
                </div>
              </div>

              {(o.items ?? []).length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 10 }}>
                  <thead><tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                    {['Producto', 'Cant.', 'Unidad', 'Costo/u', 'Subtotal'].map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {o.items.map((it, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '5px 8px', fontWeight: 600 }}>{it.product_name}</td>
                        <td style={{ padding: '5px 8px' }}>{it.quantity}</td>
                        <td style={{ padding: '5px 8px' }}>{it.unit}</td>
                        <td style={{ padding: '5px 8px' }}>{fmt(it.unit_cost)}</td>
                        <td style={{ padding: '5px 8px', fontWeight: 700 }}>{fmt((it.quantity ?? 0) * (it.unit_cost ?? 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {o.status === 'pendiente' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => updateStatus(o.id, 'recibida')} style={{ padding: '7px 16px', border: '2px solid #16a34a', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>✅ Marcar como recibida</button>
                  <button onClick={() => updateStatus(o.id, 'cancelada')} style={{ padding: '7px 14px', border: '2px solid #e5e7eb', borderRadius: 8, background: 'white', color: '#9ca3af', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Cancelar OC</button>
                </div>
              )}
              {o.notes && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{o.notes}</div>}
            </div>
          );
        })}
        {!orders.length && <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0' }}>Sin órdenes de compra.</div>}
      </div>

      {/* Modal nueva OC */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
          <div style={{ background: 'white', border: '2px solid #111', borderRadius: 14, padding: 28, width: '100%', maxWidth: 620, boxShadow: '6px 6px 0 #111', marginTop: 20, marginBottom: 20 }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 18px' }}>Nueva Orden de Compra</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Proveedor registrado</label>
                <select value={form.supplier_id} onChange={e => {
                  const s = suppliers.find(s => s.id === e.target.value);
                  setForm(f => ({ ...f, supplier_id: e.target.value, supplier_name: s?.name ?? '' }));
                }} style={{ ...inputStyle, background: 'white' }}>
                  <option value="">— Seleccionar —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nombre libre</label>
                <input value={form.supplier_name} onChange={e => setForm(f => ({ ...f, supplier_name: e.target.value }))} style={inputStyle} placeholder="Si no está registrado" />
              </div>
              <div>
                <label style={labelStyle}>Fecha esperada de entrega</label>
                <input type="date" value={form.expected_date} onChange={e => setForm(f => ({ ...f, expected_date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} placeholder="Opcional" />
              </div>
            </div>

            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Productos a pedir</div>
            {form.items.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 110px 36px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input placeholder="Producto" value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} style={{ ...inputStyle, padding: '8px 10px' }} />
                <input type="number" placeholder="Cant." value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} style={{ ...inputStyle, padding: '8px 8px' }} />
                <select value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} style={{ ...inputStyle, padding: '8px 6px', background: 'white' }}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" placeholder="$/unit" value={item.unit_cost} onChange={e => updateItem(i, 'unit_cost', e.target.value)} style={{ ...inputStyle, padding: '8px 8px' }} step="0.01" />
                <button onClick={() => removeItem(i)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16, padding: '6px', color: '#dc2626' }}>✕</button>
              </div>
            ))}
            <button onClick={addItem} style={{ padding: '7px 14px', border: '2px dashed #d1d5db', borderRadius: 8, background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#6b7280', marginBottom: 14 }}>+ Producto</button>

            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Total estimado:</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: '#111' }}>{fmt(total)}</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #d1d5db', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: '2px solid #111', background: '#F97316', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>
                {saving ? 'Guardando...' : 'Crear Orden de Compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
