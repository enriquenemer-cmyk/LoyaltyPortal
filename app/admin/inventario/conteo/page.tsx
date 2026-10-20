'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

type CountSummary = {
  id: string; status: string; notes: string | null; started_by: string | null; closed_by: string | null;
  started_at: string; closed_at: string | null; total_items: number; counted_items: number; diff_items: number;
};
type CountItem = { id: string; product_id: string; product_name: string; unit: string; expected_stock: string; counted_stock: string | null; counted_at: string | null };
type CountDetail = CountSummary & { items: CountItem[] };

const cardStyle = { background: 'var(--apple-bg-2)', border: '0.5px solid var(--apple-sep)', borderRadius: 12, padding: 18, boxShadow: 'var(--apple-shadow-2)' } as const;

function fmtQty(v: string | number) {
  return (Math.round(Number(v) * 1000) / 1000).toString();
}

export default function ConteoFisicoPage() {
  const [history, setHistory] = useState<CountSummary[]>([]);
  const [open, setOpen] = useState<CountDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory/conteos');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial de conteos');
      const counts: CountSummary[] = data.counts ?? [];
      setHistory(counts);
      const openCount = counts.find((c) => c.status === 'abierto');
      if (openCount) {
        await loadDetail(openCount.id);
      } else {
        setOpen(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial de conteos');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id: string) {
    const res = await fetch(`/api/admin/inventory/conteos/${id}`);
    const data = await res.json();
    if (res.ok) {
      setOpen(data.count);
      const d: Record<string, string> = {};
      for (const it of data.count.items as CountItem[]) {
        d[it.id] = it.counted_stock ?? '';
      }
      setDrafts(d);
    }
  }

  useEffect(() => { load(); }, []);

  async function iniciarConteo() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/inventory/conteos', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el conteo');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el conteo');
    } finally {
      setBusy(false);
    }
  }

  async function guardarAvance() {
    if (!open) return;
    setBusy(true);
    setError('');
    try {
      const items = open.items.map((it) => ({
        item_id: it.id,
        counted_stock: drafts[it.id] === '' || drafts[it.id] === undefined ? null : Number(drafts[it.id]),
      }));
      const res = await fetch(`/api/admin/inventory/conteos/${open.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el avance');
      await loadDetail(open.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el avance');
    } finally {
      setBusy(false);
    }
  }

  async function cerrarConteo() {
    if (!open) return;
    const pendientes = open.items.filter((it) => drafts[it.id] === '' || drafts[it.id] === undefined).length;
    const msg = pendientes > 0
      ? `${pendientes} artículo(s) sin contar quedarán sin ajustar. ¿Cerrar el conteo de todas formas?`
      : '¿Cerrar el conteo y aplicar los ajustes de stock?';
    if (!confirm(msg)) return;
    setBusy(true);
    setError('');
    try {
      await guardarAvance();
      const res = await fetch(`/api/admin/inventory/conteos/${open.id}/cerrar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cerrar el conteo');
      alert(`Conteo cerrado. Se ajustaron ${data.adjusted_items} artículo(s).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cerrar el conteo');
    } finally {
      setBusy(false);
    }
  }

  async function cancelarConteo() {
    if (!open) return;
    if (!confirm('¿Cancelar este conteo sin aplicar ningún ajuste?')) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/inventory/conteos/${open.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cancelar el conteo');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cancelar el conteo');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--apple-label)', margin: 0 }}>📋 Conteo Físico de Inventario</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Compara el stock del sistema contra el conteo físico real y ajusta las diferencias.
          </p>
        </div>
        <Link href="/admin/inventario" style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>← Volver a Inventario</Link>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Cargando...</div>
      ) : open ? (
        <div>
          <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Conteo en progreso — iniciado por {open.started_by || '—'}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{new Date(open.started_at).toLocaleString('es-MX')} · {open.items.length} artículos</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cancelarConteo} disabled={busy} className="cursor-pointer" style={{ padding: '8px 14px', border: '2px solid #d1d5db', borderRadius: 8, background: 'var(--apple-bg-2)', fontWeight: 700, fontSize: 12 }}>
                Cancelar conteo
              </button>
              <button onClick={guardarAvance} disabled={busy} style={{ padding: '8px 14px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#f3f4f6', fontWeight: 800, fontSize: 12 }}>
                Guardar avance
              </button>
              <button onClick={cerrarConteo} disabled={busy} style={{ padding: '8px 18px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#16a34a', color: 'white', fontWeight: 800, fontSize: 12, boxShadow: 'var(--apple-shadow-1)' }}>
                Cerrar y ajustar
              </button>
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '0.5px solid var(--apple-sep)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Sistema</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Contado</th>
                    <th style={{ textAlign: 'right', padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {open.items.map((it) => {
                    const draft = drafts[it.id] ?? '';
                    const diff = draft !== '' ? Math.round((Number(draft) - Number(it.expected_stock)) * 1000) / 1000 : null;
                    return (
                      <tr key={it.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '8px 16px', fontWeight: 700 }}>{it.product_name}</td>
                        <td style={{ padding: '8px 16px', textAlign: 'right', color: '#6b7280' }}>{fmtQty(it.expected_stock)} {it.unit}</td>
                        <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                          <input
                            type="number" min="0" step="any"
                            value={draft}
                            onChange={(e) => setDrafts((d) => ({ ...d, [it.id]: e.target.value }))}
                            placeholder="—"
                            style={{ width: 90, textAlign: 'right', border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 8px', fontSize: 13 }}
                          />
                        </td>
                        <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 800, color: diff === null ? '#9ca3af' : diff === 0 ? '#16a34a' : diff > 0 ? '#2563eb' : '#dc2626' }}>
                          {diff === null ? 'Sin contar' : `${diff > 0 ? '+' : ''}${diff} ${it.unit}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ ...cardStyle, marginBottom: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Al iniciar, se toma una foto del stock actual de todos los productos activos para comparar contra tu conteo físico.
            </p>
            <button
              onClick={iniciarConteo}
              disabled={busy}
              style={{ padding: '10px 24px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: 'var(--apple-shadow-1)' }}
            >
              {busy ? 'Iniciando...' : '+ Iniciar conteo físico'}
            </button>
          </div>

          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 10 }}>Historial</div>
          {history.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Sin conteos anteriores.</div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {history.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{new Date(c.started_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Por {c.started_by || '—'} · {c.total_items} artículos · {c.counted_items} contados</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: c.diff_items > 0 ? '#dc2626' : '#16a34a' }}>
                    {c.diff_items > 0 ? `${c.diff_items} con diferencia` : 'Sin diferencias'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
