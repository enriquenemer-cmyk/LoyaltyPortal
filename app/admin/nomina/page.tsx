'use client';
import { useEffect, useState } from 'react';

type Item = {
  employee_id: string; full_name: string; position: string | null;
  hourly_rate: number | null; days_worked: number; hours_worked: number; gross_pay: number | null;
};
type Totals = { hours: number; gross_pay: number };

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

const RANGES = [
  { label: 'Esta semana', days: 7 },
  { label: 'Quincena', days: 15 },
  { label: 'Mes', days: 30 },
];

const cardStyle = { background: 'white', border: '2px solid #111', borderRadius: 12, padding: 18, boxShadow: '4px 4px 0 #111' } as const;

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

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>🧾 Nómina (estimado)</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Horas reales fichadas × tarifa por hora de cada empleado.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRangeDays(r.days)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: rangeDays === r.days ? 'white' : 'transparent', color: '#111',
                boxShadow: rangeDays === r.days ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#92400e' }}>
        ⚠️ Este cálculo es solo un estimado interno de referencia (horas × tarifa). No incluye retenciones, prestaciones ni ninguna obligación fiscal o legal — para eso necesitas un sistema de nómina certificado en tu país.
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
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #111' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Empleado</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Días trabajados</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Horas</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Tarifa/hora</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Estimado a pagar</th>
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
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: it.hourly_rate !== null ? '#374151' : '#9ca3af' }}>
                          {it.hourly_rate !== null ? fmt(it.hourly_rate) : 'Sin tarifa'}
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
                &ldquo;Sin tarifa&rdquo; = el empleado no tiene tarifa por hora configurada. Agrégala en Fichajes → editar empleado.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
