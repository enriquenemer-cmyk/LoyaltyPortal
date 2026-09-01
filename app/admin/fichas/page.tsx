'use client';
import { useEffect, useState } from 'react';

type Ingredient = { id?: string; ingredient_name: string; quantity: number; unit: string; unit_cost: number; total_cost?: number };
type CostCard = {
  id: string; name: string; category?: string; type: string; unit: string;
  cost_per_unit: string; selling_price?: string; margin_pct?: string; notes?: string;
  ingredients?: Ingredient[];
};

const UNITS_PROD = ['pza', 'kg', 'l', 'porción', 'caja', 'bolsa', 'rollo', 'par'];
const UNITS_ING = ['g', 'kg', 'ml', 'l', 'pza', 'cdita', 'cda', 'taza'];

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

function marginColor(m: number) {
  if (m >= 50) return '#16a34a';
  if (m >= 30) return '#F97316';
  return '#dc2626';
}

const emptyCard = () => ({
  name: '', category: '', type: 'simple' as 'simple' | 'prepared',
  unit: 'pza', cost_per_unit: '', selling_price: '', notes: '',
  ingredients: [{ ingredient_name: '', quantity: 100, unit: 'g', unit_cost: 0 }],
});

export default function FichasPage() {
  const [cards, setCards] = useState<CostCard[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCard());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'simple' | 'prepared'>('all');

  async function load() {
    const res = await fetch('/api/admin/fichas');
    if (res.ok) setCards(await res.json());
  }

  useEffect(() => {
    fetch('/api/admin/setup-contabilidad', { method: 'POST' }).catch(() => {});
    load();
  }, []);

  function openNew() { setForm(emptyCard()); setEditId(null); setShowForm(true); }
  function openEdit(c: CostCard) {
    setForm({
      name: c.name, category: c.category ?? '', type: c.type as 'simple' | 'prepared',
      unit: c.unit, cost_per_unit: c.cost_per_unit, selling_price: c.selling_price ?? '',
      notes: c.notes ?? '',
      ingredients: c.ingredients?.length
        ? c.ingredients.map(i => ({ ingredient_name: i.ingredient_name, quantity: i.quantity, unit: i.unit, unit_cost: i.unit_cost }))
        : [{ ingredient_name: '', quantity: 100, unit: 'g', unit_cost: 0 }],
    });
    setEditId(c.id);
    setShowForm(true);
  }

  async function saveCard() {
    if (!form.name.trim()) return;
    setSaving(true);
    const url = editId ? `/api/admin/fichas/${editId}` : '/api/admin/fichas';
    const method = editId ? 'PATCH' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        cost_per_unit: parseFloat(form.cost_per_unit) || 0,
        selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
        ingredients: form.type === 'prepared' ? form.ingredients : [],
      }),
    });
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function deleteCard(id: string) {
    if (!confirm('¿Eliminar ficha?')) return;
    await fetch(`/api/admin/fichas/${id}`, { method: 'DELETE' });
    load();
  }

  function addIngredient() {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { ingredient_name: '', quantity: 100, unit: 'g', unit_cost: 0 }] }));
  }
  function removeIngredient(i: number) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
  }
  function updateIng(i: number, key: string, val: string | number) {
    setForm(f => {
      const ingredients = [...f.ingredients];
      ingredients[i] = { ...ingredients[i], [key]: val };
      return { ...f, ingredients };
    });
  }

  const recipeCost = form.ingredients.reduce(
    (s, i) => s + (parseFloat(String(i.quantity)) || 0) * (parseFloat(String(i.unit_cost)) || 0), 0
  );
  const displayCost = form.type === 'prepared' ? recipeCost : (parseFloat(form.cost_per_unit) || 0);
  const sellingP = parseFloat(form.selling_price) || 0;
  const previewMargin = sellingP > 0 && displayCost > 0 ? Math.round(((sellingP - displayCost) / sellingP) * 10000) / 100 : null;

  const filtered = filter === 'all' ? cards : cards.filter(c => c.type === filter);

  const inputStyle = { width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: 12, fontWeight: 700 as const, color: '#374151', display: 'block' as const, marginBottom: 4 };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>Fichas de Costo</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Precios de productos simples y fichas técnicas de elaborados</p>
        </div>
        <button onClick={openNew} style={{ padding: '8px 18px', border: '2px solid #111', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>+ Nueva ficha</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {(['all', 'simple', 'prepared'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
            background: filter === f ? 'white' : 'transparent', color: '#111',
            boxShadow: filter === f ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
          }}>
            {f === 'all' ? 'Todos' : f === 'simple' ? '📦 Simples' : '🍳 Elaborados'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 16 }}>
        {filtered.map(c => {
          const cost = parseFloat(c.cost_per_unit);
          const selling = c.selling_price ? parseFloat(c.selling_price) : null;
          const margin = c.margin_pct ? parseFloat(c.margin_pct) : null;
          return (
            <div key={c.id} style={{ background: 'white', border: '2px solid #111', borderRadius: 12, padding: 18, boxShadow: '4px 4px 0 #111' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: '#111' }}>{c.type === 'prepared' ? '🍳' : '📦'} {c.name}</div>
                  {c.category && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{c.category}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openEdit(c)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '5px 8px', fontSize: 13 }}>✏️</button>
                  <button onClick={() => deleteCard(c.id)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '5px 8px', fontSize: 13 }}>🗑️</button>
                </div>
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Costo</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#dc2626' }}>{fmt(cost)}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>por {c.unit}</div>
                </div>
                {selling !== null && (
                  <div style={{ background: '#f0fdf4', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Venta</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#16a34a' }}>{fmt(selling)}</div>
                    {margin !== null && <div style={{ fontSize: 10, color: marginColor(margin), fontWeight: 700 }}>{margin.toFixed(1)}% margen</div>}
                  </div>
                )}
              </div>

              {c.type === 'prepared' && c.ingredients && c.ingredients.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 11, color: '#6b7280' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Receta:</div>
                  {c.ingredients.map((ing, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6', padding: '2px 0' }}>
                      <span>{ing.ingredient_name} ({ing.quantity}{ing.unit})</span>
                      <span style={{ fontWeight: 600 }}>{fmt((ing.quantity ?? 0) * (ing.unit_cost ?? 0))}</span>
                    </div>
                  ))}
                </div>
              )}
              {c.notes && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, fontStyle: 'italic' }}>{c.notes}</div>}
            </div>
          );
        })}
        {!filtered.length && <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0' }}>Sin fichas registradas.</div>}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'white', border: '2px solid #111', borderRadius: 14, padding: 28, width: '100%', maxWidth: 600, boxShadow: '6px 6px 0 #111', marginTop: 20, marginBottom: 20 }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 18px' }}>{editId ? 'Editar ficha' : 'Nueva ficha de costo'}</h2>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {(['simple', 'prepared'] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: '2px solid #111', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  background: form.type === t ? '#111' : 'white', color: form.type === t ? 'white' : '#111',
                }}>
                  {t === 'simple' ? '📦 Producto simple' : '🍳 Producto elaborado'}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={labelStyle}>Nombre del producto *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="Ej. Hamburguesa clásica" />
              </div>
              <div>
                <label style={labelStyle}>Categoría</label>
                <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inputStyle} placeholder="Ej. Alimentos, Bebidas" />
              </div>
              <div>
                <label style={labelStyle}>Unidad de venta</label>
                <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} style={{ ...inputStyle, background: 'white' }}>
                  {UNITS_PROD.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {form.type === 'simple' && (
                <div>
                  <label style={labelStyle}>Costo por unidad (MXN)</label>
                  <input type="number" step="0.01" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} style={inputStyle} placeholder="0.00" />
                </div>
              )}
              <div>
                <label style={labelStyle}>Precio de venta (MXN)</label>
                <input type="number" step="0.01" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} style={inputStyle} placeholder="0.00" />
              </div>
            </div>

            {/* Preview de margen */}
            {previewMargin !== null && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Costo: {fmt(displayCost)}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Venta: {fmt(sellingP)}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: marginColor(previewMargin) }}>Margen: {previewMargin.toFixed(1)}%</span>
              </div>
            )}

            {form.type === 'prepared' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#111', marginBottom: 10 }}>Ingredientes / Receta</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 110px 32px', gap: 6, marginBottom: 6 }}>
                  {['Ingrediente', 'Cant.', 'Unidad', 'Costo/ud', ''].map(h => (
                    <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</div>
                  ))}
                </div>
                {form.ingredients.map((ing, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 110px 32px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    <input placeholder="Ej. Carne molida" value={ing.ingredient_name} onChange={e => updateIng(i, 'ingredient_name', e.target.value)} style={{ ...inputStyle, padding: '7px 10px' }} />
                    <input type="number" value={ing.quantity} onChange={e => updateIng(i, 'quantity', e.target.value)} style={{ ...inputStyle, padding: '7px 8px' }} />
                    <select value={ing.unit} onChange={e => updateIng(i, 'unit', e.target.value)} style={{ ...inputStyle, padding: '7px 6px', background: 'white' }}>
                      {UNITS_ING.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" step="0.001" placeholder="$/ud" value={ing.unit_cost} onChange={e => updateIng(i, 'unit_cost', e.target.value)} style={{ ...inputStyle, padding: '7px 8px' }} />
                    <button onClick={() => removeIngredient(i)} style={{ background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, padding: '6px', color: '#dc2626' }}>✕</button>
                  </div>
                ))}
                <button onClick={addIngredient} style={{ padding: '6px 12px', border: '2px dashed #d1d5db', borderRadius: 8, background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', color: '#6b7280', marginBottom: 4 }}>+ Ingrediente</button>
                {form.ingredients.length > 0 && (
                  <div style={{ marginTop: 8, fontWeight: 800, fontSize: 14, color: '#dc2626' }}>
                    Costo total receta: {fmt(recipeCost)}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Notas</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inputStyle} placeholder="Opcional" />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #d1d5db', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveCard} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: '2px solid #111', background: '#F97316', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>
                {saving ? 'Guardando...' : editId ? 'Actualizar' : 'Guardar ficha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
