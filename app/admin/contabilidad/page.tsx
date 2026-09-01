'use client';
import { useEffect, useState, useCallback } from 'react';

type Entry = { id: string; date: string; type: string; category: string; amount: string; description: string };
type DayRow = { date: string; income: string; expense: string };
type CategRow = { category: string; type: string; total: string };

type Summary = {
  income: number;
  expense: number;
  profit: number;
  margin: number;
  by_day: DayRow[];
  by_category: CategRow[];
  recent: Entry[];
};

const CATEGORY_LABELS: Record<string, string> = {
  compra_proveedor: 'Compra a proveedor',
  venta: 'Venta',
  nomina: 'Nómina',
  renta: 'Renta',
  servicios: 'Servicios',
  mantenimiento: 'Mantenimiento',
  general: 'General',
  otro: 'Otro',
};

const EXPENSE_CATEGORIES = ['compra_proveedor', 'nomina', 'renta', 'servicios', 'mantenimiento', 'otro', 'general'];
const INCOME_CATEGORIES = ['venta', 'otro', 'general'];

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

export default function ContabilidadPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'expense', category: 'compra_proveedor', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/contabilidad?period=${period}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Setup tables on first load
  useEffect(() => {
    fetch('/api/admin/setup-contabilidad', { method: 'POST' }).catch(() => {});
  }, []);

  async function saveEntry() {
    if (!form.amount || parseFloat(form.amount) <= 0) return;
    setSaving(true);
    await fetch('/api/admin/contabilidad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ type: 'expense', category: 'compra_proveedor', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
    load();
  }

  const maxBar = data
    ? Math.max(...data.by_day.map(d => Math.max(parseFloat(d.income), parseFloat(d.expense))), 1)
    : 1;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>Contabilidad</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Ingresos, gastos y margen en tiempo real</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(['week', 'month', 'year'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '7px 16px', borderRadius: 8, border: '2px solid #111', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: period === p ? '#111' : 'white', color: period === p ? 'white' : '#111',
            }}>
              {p === 'week' ? '7 días' : p === 'month' ? '30 días' : '1 año'}
            </button>
          ))}
          <button onClick={() => setShowForm(true)} style={{
            padding: '7px 18px', borderRadius: 8, border: '2px solid #111', background: '#F97316',
            color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #111',
          }}>+ Registrar</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Ingresos', value: data?.income ?? 0, color: '#16a34a', icon: '📈' },
          { label: 'Gastos', value: data?.expense ?? 0, color: '#dc2626', icon: '📉' },
          { label: 'Utilidad', value: data?.profit ?? 0, color: data && data.profit >= 0 ? '#1a6b3c' : '#dc2626', icon: '💰' },
          { label: 'Margen', value: null, text: `${data?.margin?.toFixed(1) ?? '0'}%`, color: data && (data.margin ?? 0) >= 20 ? '#1a6b3c' : '#F97316', icon: '📊' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'white', border: '2px solid #111', borderRadius: 12, padding: '20px 24px',
            boxShadow: '4px 4px 0 #111',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{k.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1 }}>
              {loading ? '...' : k.text ?? fmt(k.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24 }}>
        {/* Chart */}
        <div style={{ background: 'white', border: '2px solid #111', borderRadius: 12, padding: 20, boxShadow: '4px 4px 0 #111' }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 16, color: '#111' }}>Ingresos vs Gastos por día</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, overflowX: 'auto' }}>
            {(data?.by_day ?? []).map(d => (
              <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28, gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                  <div style={{
                    width: 10, background: '#16a34a', borderRadius: '3px 3px 0 0',
                    height: `${(parseFloat(d.income) / maxBar) * 120}px`,
                  }} title={`Ingreso: ${fmt(parseFloat(d.income))}`} />
                  <div style={{
                    width: 10, background: '#dc2626', borderRadius: '3px 3px 0 0',
                    height: `${(parseFloat(d.expense) / maxBar) * 120}px`,
                  }} title={`Gasto: ${fmt(parseFloat(d.expense))}`} />
                </div>
                <div style={{ fontSize: 9, color: '#9ca3af', textAlign: 'center' }}>{d.date.slice(5)}</div>
              </div>
            ))}
            {!loading && (!data?.by_day?.length) && (
              <div style={{ color: '#9ca3af', fontSize: 13, alignSelf: 'center', margin: '0 auto' }}>Sin datos en este período</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#6b7280' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#16a34a', borderRadius: 2, marginRight: 4 }} />Ingresos</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#dc2626', borderRadius: 2, marginRight: 4 }} />Gastos</span>
          </div>
        </div>

        {/* By category */}
        <div style={{ background: 'white', border: '2px solid #111', borderRadius: 12, padding: 20, boxShadow: '4px 4px 0 #111', overflow: 'auto' }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14, color: '#111' }}>Por categoría</div>
          {(data?.by_category ?? []).map(c => (
            <div key={`${c.type}-${c.category}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>{CATEGORY_LABELS[c.category] ?? c.category}</div>
                <div style={{ fontSize: 10, color: c.type === 'income' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                  {c.type === 'income' ? '▲ Ingreso' : '▼ Gasto'}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: c.type === 'income' ? '#16a34a' : '#dc2626' }}>
                {fmt(parseFloat(c.total))}
              </div>
            </div>
          ))}
          {!loading && !data?.by_category?.length && <div style={{ color: '#9ca3af', fontSize: 12 }}>Sin movimientos</div>}
        </div>
      </div>

      {/* Recent entries */}
      <div style={{ background: 'white', border: '2px solid #111', borderRadius: 12, padding: 20, boxShadow: '4px 4px 0 #111' }}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14, color: '#111' }}>Últimos movimientos</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #111' }}>
                {['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 800, fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.recent ?? []).map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 10px', color: '#6b7280', fontSize: 12 }}>{e.date}</td>
                  <td style={{ padding: '10px 10px' }}>
                    <span style={{
                      background: e.type === 'income' ? '#dcfce7' : '#fee2e2',
                      color: e.type === 'income' ? '#16a34a' : '#dc2626',
                      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
                    }}>
                      {e.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 10px', color: '#374151', fontSize: 12 }}>{CATEGORY_LABELS[e.category] ?? e.category}</td>
                  <td style={{ padding: '10px 10px', color: '#374151' }}>{e.description ?? '—'}</td>
                  <td style={{ padding: '10px 10px', fontWeight: 700, color: e.type === 'income' ? '#16a34a' : '#dc2626' }}>
                    {e.type === 'expense' ? '-' : '+'}{fmt(parseFloat(e.amount))}
                  </td>
                </tr>
              ))}
              {!loading && !data?.recent?.length && (
                <tr><td colSpan={5} style={{ padding: 20, color: '#9ca3af', textAlign: 'center', fontSize: 13 }}>Sin movimientos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: add entry */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', border: '2px solid #111', borderRadius: 14, padding: 28, width: '100%', maxWidth: 440, boxShadow: '6px 6px 0 #111' }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 20px' }}>Registrar movimiento</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => {
                  setForm(f => ({ ...f, type: t, category: t === 'expense' ? 'compra_proveedor' : 'venta' }));
                }} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: '2px solid #111', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  background: form.type === t ? (t === 'income' ? '#dcfce7' : '#fee2e2') : 'white',
                  color: form.type === t ? (t === 'income' ? '#16a34a' : '#dc2626') : '#111',
                }}>
                  {t === 'income' ? '📈 Ingreso' : '📉 Gasto'}
                </button>
              ))}
            </div>
            {[
              { label: 'Fecha', key: 'date', type: 'date' },
              { label: 'Monto (MXN)', key: 'amount', type: 'number' },
              { label: 'Descripción', key: 'description', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input
                  type={f.type}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  step={f.key === 'amount' ? '0.01' : undefined}
                  style={{ width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Categoría</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, background: 'white' }}>
                {(form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #d1d5db', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveEntry} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: '2px solid #111', background: '#F97316', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
