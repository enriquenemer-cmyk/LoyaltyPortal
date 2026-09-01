'use client';
import { useEffect, useState } from 'react';

type Supplier = { id: string; name: string; contact_name?: string; phone?: string; email?: string; notes?: string; purchase_count: number; total_spent: string };
type PurchaseItem = { product_name: string; quantity: number; unit: string; unit_cost: number };
type Purchase = { id: string; date: string; supplier_name: string; invoice_number?: string; total: string; notes?: string; items: PurchaseItem[] };

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

const UNITS = ['pza', 'kg', 'g', 'l', 'ml', 'caja', 'bolsa', 'litro', 'rollo', 'par'];

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [tab, setTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [showSupForm, setShowSupForm] = useState(false);
  const [showPurchForm, setShowPurchForm] = useState(false);
  const [supForm, setSupForm] = useState({ name: '', contact_name: '', phone: '', email: '', notes: '' });
  const [purchForm, setPurchForm] = useState({
    supplier_id: '', supplier_name: '', invoice_number: '', date: new Date().toISOString().slice(0, 10), notes: '',
    items: [{ product_name: '', quantity: 1, unit: 'pza', unit_cost: 0 }],
  });
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    const [s, p] = await Promise.all([
      fetch('/api/admin/proveedores').then(r => r.ok ? r.json() : []),
      fetch('/api/admin/compras?limit=50').then(r => r.ok ? r.json() : []),
    ]);
    setSuppliers(s);
    setPurchases(p);
  }

  useEffect(() => {
    fetch('/api/admin/setup-contabilidad', { method: 'POST' }).catch(() => {});
    loadAll();
  }, []);

  async function saveSupplier() {
    if (!supForm.name.trim()) return;
    setSaving(true);
    await fetch('/api/admin/proveedores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supForm) });
    setSaving(false);
    setShowSupForm(false);
    setSupForm({ name: '', contact_name: '', phone: '', email: '', notes: '' });
    loadAll();
  }

  async function deleteSupplier(id: string) {
    if (!confirm('¿Eliminar proveedor?')) return;
    await fetch(`/api/admin/proveedores/${id}`, { method: 'DELETE' });
    loadAll();
  }

  function addItem() {
    setPurchForm(f => ({ ...f, items: [...f.items, { product_name: '', quantity: 1, unit: 'pza', unit_cost: 0 }] }));
  }
  function removeItem(i: number) {
    setPurchForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  }
  function updateItem(i: number, key: string, val: string | number) {
    setPurchForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [key]: val };
      return { ...f, items };
    });
  }

  const purchTotal = purchForm.items.reduce((s, i) => s + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.unit_cost)) || 0), 0);

  async function savePurchase() {
    if (!purchForm.supplier_name && !purchForm.supplier_id) return;
    setSaving(true);
    const body = {
      ...purchForm,
      supplier_name: purchForm.supplier_name || suppliers.find(s => s.id === purchForm.supplier_id)?.name,
    };
    await fetch('/api/admin/compras', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSaving(false);
    setShowPurchForm(false);
    setPurchForm({ supplier_id: '', supplier_name: '', invoice_number: '', date: new Date().toISOString().slice(0, 10), notes: '', items: [{ product_name: '', quantity: 1, unit: 'pza', unit_cost: 0 }] });
    loadAll();
  }

  const inputStyle = { width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: 12, fontWeight: 700 as const, color: '#374151', display: 'block' as const, marginBottom: 4 };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>Proveedores y Compras</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Registra proveedores y entradas de mercancía</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowSupForm(true)} style={{ padding: '8px 16px', border: '2px solid #111', borderRadius: 8, background: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>+ Proveedor</button>
          <button onClick={() => setShowPurchForm(true)} style={{ padding: '8px 18px', border: '2px solid #111', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>+ Compra</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['suppliers', 'purchases'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: tab === t ? 'white' : 'transparent', color: '#111',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
          }}>
            {t === 'suppliers' ? `Proveedores (${suppliers.length})` : `Compras (${purchases.length})`}
          </button>
        ))}
      </div>

      {tab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
          {suppliers.map(s => (
            <div key={s.id} style={{ background: 'white', border: '2px solid #111', borderRadius: 12, padding: 18, boxShadow: '4px 4px 0 #111' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#111' }}>🏪 {s.name}</div>
                <button onClick={() => deleteSupplier(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af' }}>✕</button>
              </div>
              {s.contact_name && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>👤 {s.contact_name}</div>}
              {s.phone && <div style={{ fontSize: 12, color: '#374151' }}>📞 {s.phone}</div>}
              {s.email && <div style={{ fontSize: 12, color: '#374151' }}>📧 {s.email}</div>}
              {s.notes && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, fontStyle: 'italic' }}>{s.notes}</div>}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 16 }}>
                <div><div style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>{s.purchase_count}</div><div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700 }}>COMPRAS</div></div>
                <div><div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{fmt(parseFloat(s.total_spent))}</div><div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700 }}>TOTAL GASTADO</div></div>
              </div>
            </div>
          ))}
          {!suppliers.length && <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0' }}>Aún no hay proveedores registrados.</div>}
        </div>
      )}

      {tab === 'purchases' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {purchases.map(p => (
            <div key={p.id} style={{ background: 'white', border: '2px solid #111', borderRadius: 12, padding: 18, boxShadow: '3px 3px 0 #111' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#111' }}>🏪 {p.supplier_name ?? '—'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{p.date}{p.invoice_number ? ` · Factura ${p.invoice_number}` : ''}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{fmt(parseFloat(p.total))}</div>
              </div>
              {(p.items ?? []).length > 0 && (
                <div style={{ marginTop: 12, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                      {['Producto', 'Cantidad', 'Unidad', 'Costo unitario', 'Subtotal'].map(h => <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 700, color: '#6b7280', fontSize: 11 }}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {p.items.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '5px 8px', fontWeight: 600 }}>{it.product_name}</td>
                          <td style={{ padding: '5px 8px' }}>{it.quantity}</td>
                          <td style={{ padding: '5px 8px' }}>{it.unit}</td>
                          <td style={{ padding: '5px 8px' }}>{fmt(it.unit_cost)}</td>
                          <td style={{ padding: '5px 8px', fontWeight: 700 }}>{fmt((it.quantity ?? 0) * (it.unit_cost ?? 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {p.notes && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>{p.notes}</div>}
            </div>
          ))}
          {!purchases.length && <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0' }}>Sin compras registradas.</div>}
        </div>
      )}

      {/* Modal: nuevo proveedor */}
      {showSupForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', border: '2px solid #111', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420, boxShadow: '6px 6px 0 #111' }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 18px' }}>Nuevo proveedor</h2>
            {[
              { label: 'Nombre *', key: 'name' },
              { label: 'Contacto', key: 'contact_name' },
              { label: 'Teléfono', key: 'phone' },
              { label: 'Email', key: 'email' },
              { label: 'Notas', key: 'notes' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{f.label}</label>
                <input value={(supForm as Record<string,string>)[f.key]} onChange={e => setSupForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => setShowSupForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #d1d5db', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveSupplier} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: '2px solid #111', background: '#F97316', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: nueva compra */}
      {showPurchForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
          <div style={{ background: 'white', border: '2px solid #111', borderRadius: 14, padding: 28, width: '100%', maxWidth: 620, boxShadow: '6px 6px 0 #111', margin: 'auto' }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 18px' }}>Registrar compra</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={labelStyle}>Proveedor</label>
                <select value={purchForm.supplier_id} onChange={e => {
                  const s = suppliers.find(s => s.id === e.target.value);
                  setPurchForm(f => ({ ...f, supplier_id: e.target.value, supplier_name: s?.name ?? '' }));
                }} style={{ ...inputStyle, background: 'white' }}>
                  <option value="">— Seleccionar —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nombre libre (si no está registrado)</label>
                <input value={purchForm.supplier_name} onChange={e => setPurchForm(f => ({ ...f, supplier_name: e.target.value }))} style={inputStyle} placeholder="Ej. Costco" />
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={purchForm.date} onChange={e => setPurchForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>No. Factura / Ticket</label>
                <input value={purchForm.invoice_number} onChange={e => setPurchForm(f => ({ ...f, invoice_number: e.target.value }))} style={inputStyle} placeholder="FAC-001" />
              </div>
            </div>

            <div style={{ fontWeight: 800, fontSize: 13, color: '#111', marginBottom: 10 }}>Productos comprados</div>
            {purchForm.items.map((item, i) => (
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
            <button onClick={addItem} style={{ padding: '7px 14px', border: '2px dashed #d1d5db', borderRadius: 8, background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#6b7280', marginBottom: 16 }}>+ Agregar producto</button>

            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Total de compra:</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: '#dc2626' }}>{fmt(purchTotal)}</span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Notas</label>
              <input value={purchForm.notes} onChange={e => setPurchForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} placeholder="Opcional" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowPurchForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #d1d5db', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={savePurchase} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: '2px solid #111', background: '#F97316', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>
                {saving ? 'Guardando...' : 'Guardar compra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
