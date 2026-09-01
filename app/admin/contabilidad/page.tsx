'use client';
import { useEffect, useState, useCallback } from 'react';

type Entry = { id: string; date: string; type: string; category: string; amount: string; description: string };
type DayRow = { date: string; income: string; expense: string };
type CategRow = { category: string; type: string; total: string };
type Summary = {
  income: number; expense: number; profit: number; margin: number;
  by_day: DayRow[]; by_category: CategRow[]; recent: Entry[];
};
type CorteCaja = {
  date: string; income: number; expense: number; net: number;
  pos_sales: number; pos_total: number; claims_today: number;
  by_payment_method: { payment_method: string; count: string; total: string }[];
};
type FlujoCaja = {
  daily_income_avg: number; daily_expense_avg: number; daily_net_avg: number;
  monthly_projection: number; pending_payables: number;
  projection: { date: string; projected_income: number; projected_expense: number; cumulative: number }[];
};
type BudgetItem = { category: string; budgeted: string; actual: string };

const CATEGORY_LABELS: Record<string, string> = {
  compra_proveedor: 'Compra proveedor', venta: 'Venta', nomina: 'Nómina',
  renta: 'Renta', servicios: 'Servicios', mantenimiento: 'Mantenimiento',
  general: 'General', otro: 'Otro', corte_caja: 'Corte de caja',
};
const EXPENSE_CATEGORIES = ['compra_proveedor', 'nomina', 'renta', 'servicios', 'mantenimiento', 'otro', 'general'];
const INCOME_CATEGORIES = ['venta', 'otro', 'general'];

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}
function pct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }

export default function ContabilidadPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [corte, setCorte] = useState<CorteCaja | null>(null);
  const [flujo, setFlujo] = useState<FlujoCaja | null>(null);
  const [budget, setBudget] = useState<BudgetItem[]>([]);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [tab, setTab] = useState<'resumen' | 'pyg' | 'corte' | 'flujo' | 'presupuesto'>('resumen');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'expense', category: 'compra_proveedor', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ category: 'nomina', budgeted: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, f, b] = await Promise.all([
        fetch(`/api/admin/contabilidad?period=${period}`).then(r => r.ok ? r.json() : null),
        fetch('/api/admin/corte-caja').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/flujo-caja').then(r => r.ok ? r.json() : null),
        fetch('/api/admin/presupuesto').then(r => r.ok ? r.json() : null),
      ]);
      if (s) setData(s);
      if (c) setCorte(c);
      if (f) setFlujo(f);
      if (b?.budget) setBudget(b.budget);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetch('/api/admin/setup-contabilidad', { method: 'POST' }).catch(() => {});
    load();
  }, [load]);

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

  async function saveBudget() {
    if (!budgetForm.budgeted) return;
    setSaving(true);
    await fetch('/api/admin/presupuesto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: budgetForm.category, budgeted: parseFloat(budgetForm.budgeted) }),
    });
    setSaving(false);
    setShowBudgetForm(false);
    load();
  }

  function exportCSV() {
    window.location.href = `/api/admin/contabilidad/export?period=${period}`;
  }

  function downloadBackup() {
    window.location.href = '/api/admin/backup';
  }

  const maxBar = data ? Math.max(...data.by_day.map(d => Math.max(parseFloat(d.income), parseFloat(d.expense))), 1) : 1;
  const maxFlujo = flujo ? Math.max(...flujo.projection.map(p => Math.abs(p.cumulative)), 1) : 1;

  const totalIncome = data?.income ?? 0;
  const totalExpense = data?.expense ?? 0;
  const cogs = data?.by_category.filter(c => c.type === 'expense' && c.category === 'compra_proveedor').reduce((s, c) => s + parseFloat(c.total), 0) ?? 0;
  const grossProfit = totalIncome - cogs;
  const grossMargin = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;
  const opExpenses = totalExpense - cogs;
  const ebitda = grossProfit - opExpenses;

  const inputStyle = { width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: '9px 12px', fontSize: 14, boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: 12, fontWeight: 700 as const, color: '#374151', display: 'block' as const, marginBottom: 4 };
  const cardStyle = { background: 'white', border: '2px solid #111', borderRadius: 12, padding: 20, boxShadow: '4px 4px 0 #111' };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>Contabilidad</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Ingresos, gastos y margen en tiempo real</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['week', 'month', 'year'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '7px 14px', borderRadius: 8, border: '2px solid #111', cursor: 'pointer', fontWeight: 700, fontSize: 12,
              background: period === p ? '#111' : 'white', color: period === p ? 'white' : '#111',
            }}>{p === 'week' ? '7d' : p === 'month' ? '30d' : '1 año'}</button>
          ))}
          <button onClick={exportCSV} style={{ padding: '7px 14px', borderRadius: 8, border: '2px solid #16a34a', background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>⬇ CSV</button>
          <button onClick={downloadBackup} title="Descarga todos tus datos como respaldo" style={{ padding: '7px 14px', borderRadius: 8, border: '2px solid #7c3aed', background: '#f5f3ff', color: '#7c3aed', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>💾 Respaldo</button>
          <button onClick={() => setShowForm(true)} style={{ padding: '7px 16px', borderRadius: 8, border: '2px solid #111', background: '#F97316', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>+ Registrar</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        {[
          { key: 'resumen', label: '📊 Resumen' },
          { key: 'pyg', label: '📈 P&L' },
          { key: 'corte', label: '🏧 Corte de Caja' },
          { key: 'flujo', label: '💧 Flujo de Caja' },
          { key: 'presupuesto', label: '🎯 Presupuesto' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
            background: tab === t.key ? 'white' : 'transparent', color: '#111',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── RESUMEN ── */}
      {tab === 'resumen' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Ingresos', value: data?.income ?? 0, color: '#16a34a', icon: '📈' },
              { label: 'Gastos', value: data?.expense ?? 0, color: '#dc2626', icon: '📉' },
              { label: 'Utilidad', value: data?.profit ?? 0, color: (data?.profit ?? 0) >= 0 ? '#1a6b3c' : '#dc2626', icon: '💰' },
              { label: 'Margen', value: null, text: `${(data?.margin ?? 0).toFixed(1)}%`, color: (data?.margin ?? 0) >= 20 ? '#1a6b3c' : '#F97316', icon: '📊' },
            ].map(k => (
              <div key={k.label} style={cardStyle}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: k.color }}>{loading ? '...' : k.text ?? fmt(k.value ?? 0)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 16 }}>
            <div style={cardStyle}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>Ingresos vs Gastos por día</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 130, overflowX: 'auto' }}>
                {(data?.by_day ?? []).map(d => (
                  <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24, gap: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 110 }}>
                      <div style={{ width: 9, background: '#16a34a', borderRadius: '3px 3px 0 0', height: `${(parseFloat(d.income) / maxBar) * 110}px` }} />
                      <div style={{ width: 9, background: '#dc2626', borderRadius: '3px 3px 0 0', height: `${(parseFloat(d.expense) / maxBar) * 110}px` }} />
                    </div>
                    <div style={{ fontSize: 8, color: '#9ca3af' }}>{d.date.slice(5)}</div>
                  </div>
                ))}
                {!loading && !data?.by_day?.length && <div style={{ color: '#9ca3af', fontSize: 12, margin: 'auto' }}>Sin datos</div>}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10, color: '#6b7280' }}>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, background: '#16a34a', borderRadius: 2, marginRight: 4 }} />Ingresos</span>
                <span><span style={{ display: 'inline-block', width: 9, height: 9, background: '#dc2626', borderRadius: 2, marginRight: 4 }} />Gastos</span>
              </div>
            </div>
            <div style={{ ...cardStyle, overflowY: 'auto', maxHeight: 220 }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>Por categoría</div>
              {(data?.by_category ?? []).map(c => (
                <div key={`${c.type}-${c.category}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{CATEGORY_LABELS[c.category] ?? c.category}</div>
                    <div style={{ fontSize: 9, color: c.type === 'income' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{c.type === 'income' ? '▲' : '▼'}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c.type === 'income' ? '#16a34a' : '#dc2626' }}>{fmt(parseFloat(c.total))}</div>
                </div>
              ))}
              {!loading && !data?.by_category?.length && <div style={{ color: '#9ca3af', fontSize: 12 }}>Sin movimientos</div>}
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>Últimos movimientos</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '2px solid #111' }}>
                  {['Fecha','Tipo','Categoría','Descripción','Monto'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontWeight: 800, fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {(data?.recent ?? []).map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 10px', color: '#6b7280', fontSize: 11 }}>{e.date}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ background: e.type === 'income' ? '#dcfce7' : '#fee2e2', color: e.type === 'income' ? '#16a34a' : '#dc2626', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>
                          {e.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', fontSize: 11 }}>{CATEGORY_LABELS[e.category] ?? e.category}</td>
                      <td style={{ padding: '8px 10px' }}>{e.description ?? '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: e.type === 'income' ? '#16a34a' : '#dc2626' }}>
                        {e.type === 'expense' ? '-' : '+'}{fmt(parseFloat(e.amount))}
                      </td>
                    </tr>
                  ))}
                  {!loading && !data?.recent?.length && <tr><td colSpan={5} style={{ padding: 20, color: '#9ca3af', textAlign: 'center' }}>Sin movimientos</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── P&L ── */}
      {tab === 'pyg' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={cardStyle}>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 16 }}>Estado de Resultados</div>
            {[
              { label: 'Ventas / Ingresos', value: totalIncome, color: '#16a34a', bold: false },
              { label: '(-) Costo de mercancía', value: -cogs, color: '#dc2626', bold: false },
              { label: 'Utilidad Bruta', value: grossProfit, color: grossProfit >= 0 ? '#16a34a' : '#dc2626', bold: true },
              { label: `Margen bruto: ${grossMargin.toFixed(1)}%`, value: null, color: '#9ca3af', bold: false },
              { label: '(-) Gastos operativos', value: -opExpenses, color: '#dc2626', bold: false },
              { label: 'EBITDA / Utilidad Neta', value: ebitda, color: ebitda >= 0 ? '#1a6b3c' : '#dc2626', bold: true },
            ].map((row, i) => row.value !== null ? (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: row.bold ? 800 : 400 }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: row.color }}>{fmt(row.value)}</span>
              </div>
            ) : (
              <div key={i} style={{ fontSize: 11, color: row.color, padding: '2px 0 8px', fontStyle: 'italic' }}>{row.label}</div>
            ))}
          </div>
          <div style={cardStyle}>
            <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 16 }}>Desglose de Gastos</div>
            {(data?.by_category ?? []).filter(c => c.type === 'expense').map(c => {
              const val = parseFloat(c.total);
              const pctVal = totalExpense > 0 ? (val / totalExpense) * 100 : 0;
              return (
                <div key={c.category} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{CATEGORY_LABELS[c.category] ?? c.category}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>{fmt(val)} ({pctVal.toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                    <div style={{ height: 6, background: '#dc2626', borderRadius: 3, width: `${Math.min(pctVal, 100)}%` }} />
                  </div>
                </div>
              );
            })}
            {!data?.by_category?.filter(c => c.type === 'expense').length && <div style={{ color: '#9ca3af', fontSize: 12 }}>Sin gastos registrados</div>}
          </div>
        </div>
      )}

      {/* ── CORTE DE CAJA ── */}
      {tab === 'corte' && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Corte del día: {corte?.date ?? '—'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Ingresos hoy', value: corte?.income ?? 0, color: '#16a34a', icon: '📈' },
              { label: 'Gastos hoy', value: corte?.expense ?? 0, color: '#dc2626', icon: '📉' },
              { label: 'Efectivo neto', value: corte?.net ?? 0, color: (corte?.net ?? 0) >= 0 ? '#1a6b3c' : '#dc2626', icon: '💵' },
              { label: 'Ventas POS', value: corte?.pos_total ?? 0, color: '#F97316', icon: '🛒', sub: `${corte?.pos_sales ?? 0} transacciones` },
              { label: 'Canjes hoy', value: null, text: String(corte?.claims_today ?? 0), color: '#7c3aed', icon: '🎁' },
            ].map(k => (
              <div key={k.label} style={cardStyle}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: k.color }}>{k.text ?? fmt(k.value ?? 0)}</div>
                {k.sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{k.sub}</div>}
              </div>
            ))}
          </div>
          {(corte?.by_payment_method ?? []).length > 0 && (
            <div style={cardStyle}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 12 }}>Ventas POS por forma de pago</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {corte!.by_payment_method.map(m => (
                  <div key={m.payment_method} style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 16px', border: '1px solid #e5e7eb', minWidth: 140 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'capitalize' }}>{m.payment_method}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#F97316' }}>{fmt(parseFloat(m.total))}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{m.count} ventas</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FLUJO DE CAJA ── */}
      {tab === 'flujo' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Ingreso diario promedio', value: flujo?.daily_income_avg ?? 0, color: '#16a34a', icon: '📈' },
              { label: 'Gasto diario promedio', value: flujo?.daily_expense_avg ?? 0, color: '#dc2626', icon: '📉' },
              { label: 'Flujo neto diario', value: flujo?.daily_net_avg ?? 0, color: (flujo?.daily_net_avg ?? 0) >= 0 ? '#1a6b3c' : '#dc2626', icon: '💧' },
              { label: 'Proyección 30 días', value: flujo?.monthly_projection ?? 0, color: (flujo?.monthly_projection ?? 0) >= 0 ? '#1a6b3c' : '#dc2626', icon: '📅' },
              { label: 'Cuentas por pagar', value: flujo?.pending_payables ?? 0, color: '#F97316', icon: '⏳' },
            ].map(k => (
              <div key={k.label} style={cardStyle}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{fmt(k.value)}</div>
              </div>
            ))}
          </div>
          <div style={cardStyle}>
            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 14 }}>Proyección acumulada — próximos 30 días</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, overflowX: 'auto' }}>
              {(flujo?.projection ?? []).map(p => {
                const h = Math.abs(p.cumulative) / maxFlujo * 110;
                return (
                  <div key={p.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 20 }}>
                    <div style={{ width: 14, background: p.cumulative >= 0 ? '#16a34a' : '#dc2626', borderRadius: '3px 3px 0 0', height: `${h}px` }} title={`${p.date}: ${fmt(p.cumulative)}`} />
                    <div style={{ fontSize: 7, color: '#9ca3af', marginTop: 2 }}>{p.date.slice(8)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>Basado en promedio de los últimos 30 días · Verde = superávit, Rojo = déficit</div>
          </div>
        </div>
      )}

      {/* ── PRESUPUESTO ── */}
      {tab === 'presupuesto' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280' }}>Presupuesto mes actual vs Real</div>
            <button onClick={() => setShowBudgetForm(true)} style={{ padding: '7px 14px', border: '2px solid #111', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>+ Agregar</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {budget.map(b => {
              const budgeted = parseFloat(b.budgeted);
              const actual = parseFloat(b.actual ?? '0');
              const usedPct = budgeted > 0 ? Math.min((actual / budgeted) * 100, 100) : 0;
              const over = actual > budgeted;
              return (
                <div key={b.category} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{CATEGORY_LABELS[b.category] ?? b.category}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>Presupuesto: {fmt(budgeted)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: over ? '#dc2626' : '#374151' }}>{fmt(actual)}</div>
                      <div style={{ fontSize: 10, color: over ? '#dc2626' : '#16a34a', fontWeight: 700 }}>{over ? `⚠️ +${fmt(actual - budgeted)} sobre presupuesto` : `✓ ${fmt(budgeted - actual)} disponible`}</div>
                    </div>
                  </div>
                  <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4 }}>
                    <div style={{ height: 8, background: over ? '#dc2626' : '#16a34a', borderRadius: 4, width: `${usedPct}%`, transition: 'width .3s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{usedPct.toFixed(1)}% usado</div>
                </div>
              );
            })}
            {!budget.length && <div style={{ color: '#9ca3af', fontSize: 13, padding: '24px 0' }}>Sin presupuesto configurado. Agrega categorías para comparar vs real.</div>}
          </div>
        </div>
      )}

      {/* Modal: registrar movimiento */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', border: '2px solid #111', borderRadius: 14, padding: 28, width: '100%', maxWidth: 440, boxShadow: '6px 6px 0 #111' }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 18px' }}>Registrar movimiento</h2>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {(['expense', 'income'] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t, category: t === 'expense' ? 'compra_proveedor' : 'venta' }))} style={{
                  flex: 1, padding: '9px 0', borderRadius: 8, border: '2px solid #111', fontWeight: 800, fontSize: 13, cursor: 'pointer',
                  background: form.type === t ? (t === 'income' ? '#dcfce7' : '#fee2e2') : 'white',
                  color: form.type === t ? (t === 'income' ? '#16a34a' : '#dc2626') : '#111',
                }}>{t === 'income' ? '📈 Ingreso' : '📉 Gasto'}</button>
              ))}
            </div>
            {[{ label: 'Fecha', key: 'date', type: 'date' }, { label: 'Monto (MXN)', key: 'amount', type: 'number' }, { label: 'Descripción', key: 'description', type: 'text' }].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} value={(form as Record<string, string>)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={inputStyle} step={f.key === 'amount' ? '0.01' : undefined} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Categoría</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, background: 'white' }}>
                {(form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #d1d5db', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveEntry} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: '2px solid #111', background: '#F97316', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: presupuesto */}
      {showBudgetForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', border: '2px solid #111', borderRadius: 14, padding: 28, width: '100%', maxWidth: 380, boxShadow: '6px 6px 0 #111' }}>
            <h2 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 18px' }}>Agregar presupuesto</h2>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Categoría</label>
              <select value={budgetForm.category} onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))} style={{ ...inputStyle, background: 'white' }}>
                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Monto presupuestado (MXN/mes)</label>
              <input type="number" step="0.01" value={budgetForm.budgeted} onChange={e => setBudgetForm(f => ({ ...f, budgeted: e.target.value }))} style={inputStyle} placeholder="0.00" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowBudgetForm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid #d1d5db', background: 'white', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={saveBudget} disabled={saving} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: '2px solid #111', background: '#F97316', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
