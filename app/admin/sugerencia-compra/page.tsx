'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Suggestion = {
  id: string; name: string; unit: string; current_stock: number; min_stock_alert: number;
  supplier_id: string | null; supplier_name: string | null;
  avg_daily_consumption: number; days_until_stockout: number | null; suggested_qty: number;
};

const cardStyle = { background: 'var(--apple-bg-2)', border: '0.5px solid var(--apple-sep)', borderRadius: 12, padding: 18, boxShadow: 'var(--apple-shadow-2)' } as const;

function urgencyColor(days: number | null) {
  if (days === null) return '#9ca3af';
  if (days <= 3) return '#dc2626';
  if (days <= 7) return '#F97316';
  return '#ca8a04';
}

export default function SugerenciaCompraPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/reportes/sugerencia-compra');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo calcular la sugerencia de compra');
      setSuggestions(data.suggestions ?? []);
      setSelected(Object.fromEntries((data.suggestions ?? []).map((s: Suggestion) => [s.id, true])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo calcular la sugerencia de compra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function enviarAOrden() {
    const chosen = suggestions.filter((s) => selected[s.id]);
    if (chosen.length === 0) return;
    const items = chosen.map((s) => ({ product_name: s.name, quantity: s.suggested_qty, unit: s.unit, unit_cost: 0 }));
    try {
      localStorage.setItem('ordenSugerida', JSON.stringify(items));
    } catch {
      // si falla el localStorage, igual navegamos — solo no se prellenará el formulario
    }
    router.push('/admin/ordenes-compra');
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div style={{ padding: '24px', maxWidth: 950, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--apple-label)', margin: 0 }}>🛒 Sugerencia de Compra</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Basado en tu consumo real de los últimos 30 días, para cubrir 14 días de operación.
          </p>
        </div>
        <button
          onClick={enviarAOrden}
          disabled={selectedCount === 0}
          style={{ padding: '10px 20px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: 'var(--apple-shadow-1)', opacity: selectedCount === 0 ? 0.5 : 1 }}
        >
          Enviar {selectedCount > 0 ? `(${selectedCount})` : ''} a Orden de Compra →
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Calculando...</div>
      ) : suggestions.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#9ca3af' }}>
          Ningún producto necesita reabastecerse pronto. 🎉
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '0.5px solid var(--apple-sep)' }}>
                  <th style={{ padding: '10px 16px' }}></th>
                  <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Producto</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Stock actual</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Consumo/día</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Se agota en</th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Sugerido</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <input type="checkbox" checked={!!selected[s.id]} onChange={() => toggle(s.id)} style={{ width: 16, height: 16 }} />
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 700 }}>
                      {s.name}
                      {s.supplier_name && <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{s.supplier_name}</div>}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>{s.current_stock} {s.unit}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', color: '#6b7280' }}>{s.avg_daily_consumption} {s.unit}</td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, color: urgencyColor(s.days_until_stockout) }}>
                      {s.days_until_stockout !== null ? `${s.days_until_stockout} días` : '—'}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 900 }}>{s.suggested_qty} {s.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ padding: '10px 16px', fontSize: 11, color: '#9ca3af', margin: 0, borderTop: '1px solid #f3f4f6' }}>
            La cantidad sugerida cubre {14} días al ritmo de consumo actual. Ajusta lo que necesites al crear la orden.
          </p>
        </div>
      )}
    </div>
  );
}
