'use client';
import { useEffect, useState } from 'react';
import { exportToExcel } from '@/lib/exportExcel';

type Item = {
  employee_id: string; full_name: string; position: string | null;
  hourly_rate: number | null; days_worked: number; hours_worked: number; hourly_pay: number | null;
  commission_pct: number | null; sales_total: number; commission: number | null; gross_pay: number | null;
};
type Totals = { hours: number; sales_total: number; commission: number; gross_pay: number };

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

const RANGES = [
  { label: 'Esta semana', days: 7 },
  { label: 'Quincena', days: 15 },
  { label: 'Mes', days: 30 },
];

const cardStyle = { background: 'var(--apple-bg-2)', border: '0.5px solid var(--apple-sep)', borderRadius: 12, padding: 18, boxShadow: 'var(--apple-shadow-2)' } as const;

export default function NominaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [rangeDays, setRangeDays] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(days: number) {
    setLoading(true);
    setError('');
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await fetch(`/api/admin/reportes/nomina?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la nómina');
      setItems(data.items ?? []);
      setTotals(data.totals ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la nómina');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(rangeDays); }, [rangeDays]);

  function exportar() {
    exportToExcel(`nomina-${new Date().toISOString().slice(0, 10)}`, 'Nómina', items.map((it) => ({
      Empleado: it.full_name,
      Puesto: it.position ?? '',
      'Días trabajados': it.days_worked,
      Horas: it.hours_worked,
      'Tarifa/hora': it.hourly_rate ?? '',
      'Pago por horas': it.hourly_pay ?? '',
      'Comisión %': it.commission_pct ?? '',
      'Ventas del periodo': it.sales_total,
      Comisión: it.commission ?? '',
      'Total estimado': it.gross_pay ?? '',
    })));
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--apple-label)', margin: 0 }}>🧾 Nómina (estimado)</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Horas reales fichadas × tarifa por hora, más comisión por venta si aplica.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
            {RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                  background: rangeDays === r.days ? 'white' : 'transparent', color: 'var(--apple-label)',
                  boxShadow: rangeDays === r.days ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportar}
            disabled={items.length === 0}
            style={{ padding: '8px 16px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: 'var(--apple-bg-2)', fontWeight: 800, fontSize: 12, cursor: 'pointer', boxShadow: 'var(--apple-shadow-1)' }}
          >
            ⬇ Excel
          </button>
        </div>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#92400e' }}>
        ⚠️ Este cálculo es solo un estimado interno de referencia (horas × tarifa + comisión). No incluye retenciones, prestaciones ni ninguna obligación fiscal o legal — para eso necesitas un sistema de nómina certificado en tu país.
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Cargando...</div>
      ) : (
        <>
          {totals && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Horas totales</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{totals.hours.toFixed(1)} h</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Comisiones</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#7c3aed' }}>{fmt(totals.commission)}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Nómina estimada</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#F97316' }}>{fmt(totals.gross_pay)}</div>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af' }}>Sin empleados activos.</div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '0.5px solid var(--apple-sep)' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Empleado</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Días</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Horas</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Pago por horas</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Ventas</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Comisión</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.employee_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 700 }}>
                          {it.full_name}
                          {it.position && <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}> · {it.position}</span>}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>{it.days_worked}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>{it.hours_worked.toFixed(1)} h</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: it.hourly_pay !== null ? '#374151' : '#9ca3af' }}>
                          {it.hourly_pay !== null ? fmt(it.hourly_pay) : 'Sin tarifa'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280' }}>{fmt(it.sales_total)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: it.commission !== null ? '#7c3aed' : '#9ca3af' }}>
                          {it.commission !== null ? `${fmt(it.commission)} (${it.commission_pct}%)` : 'Sin comisión'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 900, color: it.gross_pay !== null ? '#16a34a' : '#9ca3af' }}>
                          {it.gross_pay !== null ? fmt(it.gross_pay) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ padding: '10px 16px', fontSize: 11, color: '#9ca3af', margin: 0, borderTop: '1px solid #f3f4f6' }}>
                Configura tarifa por hora y comisión desde Fichajes → editar empleado.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
