'use client';
import { useEffect, useState } from 'react';

type Item = {
  product_id: string; product_type: 'inventory' | 'recipe'; product_name: string;
  quantity_sold: number; revenue: number; cost: number | null; margin: number | null; margin_pct: number | null;
};
type Totals = { revenue: number; cost: number | null; margin: number | null; margin_pct: number | null };

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}
function marginColor(pct: number | null) {
  if (pct === null) return '#9ca3af';
  if (pct >= 50) return '#16a34a';
  if (pct >= 30) return '#F97316';
  return '#dc2626';
}

const RANGES = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
];

export default function RentabilidadPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(days: number) {
    setLoading(true);
    setError('');
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const res = await fetch(`/api/admin/reportes/rentabilidad?from=${from}&to=${to}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el reporte');
      setItems(data.items ?? []);
      setTotals(data.totals ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el reporte');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(rangeDays); }, [rangeDays]);

  const cardStyle = { background: 'white', border: '2px solid #111', borderRadius: 12, padding: 18, boxShadow: '4px 4px 0 #111' } as const;

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>📈 Rentabilidad por Platillo</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Margen real de lo vendido en el Punto de Venta, comparado contra el costo vigente.
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
              <div style={cardStyle}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Ingresos</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{fmt(totals.revenue)}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Costo</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{totals.cost !== null ? fmt(totals.cost) : '—'}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Margen</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#16a34a' }}>{totals.margin !== null ? fmt(totals.margin) : '—'}</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: 10, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' }}>Margen %</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: marginColor(totals.margin_pct) }}>
                  {totals.margin_pct !== null ? `${totals.margin_pct.toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af' }}>
              Sin ventas registradas en este periodo.
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #111' }}>
                      <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Platillo</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Vendidos</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Ingresos</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Costo</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Margen</th>
                      <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Margen %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.product_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 16px', fontWeight: 700 }}>
                          {it.product_type === 'recipe' ? '🍳' : '📦'} {it.product_name}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>{it.quantity_sold}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>{fmt(it.revenue)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: it.cost !== null ? '#dc2626' : '#9ca3af' }}>
                          {it.cost !== null ? fmt(it.cost) : 'Sin costo'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>
                          {it.margin !== null ? fmt(it.margin) : '—'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 900, color: marginColor(it.margin_pct) }}>
                          {it.margin_pct !== null ? `${it.margin_pct.toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ padding: '10px 16px', fontSize: 11, color: '#9ca3af', margin: 0, borderTop: '1px solid #f3f4f6' }}>
                &ldquo;Sin costo&rdquo; = producto simple sin costo registrado en Inventario. Agrégalo ahí para ver su margen aquí.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
