'use client';
import { useEffect, useState } from 'react';

type Movimiento = { id: string; date: string; amount: string; description: string };
type Compra = { id: string; supplier_name?: string; invoice_number?: string; notes?: string; total: string; date: string };
type Resultado = { coincide_proveedor: boolean; coincide_nombre: boolean; coincide_valor: boolean; num_coincidencias: number; cumple_regla: boolean };
type Sugerencia = { compra_id: string; movimiento_id: string; compra: Compra; movimiento: Movimiento; resultado: Resultado; explicacion: string };
type SinSugerencia = { compra: Compra; mejor_candidato: Movimiento | null; explicacion: string };
type Conciliado = {
  compra_id: string; supplier_name?: string; invoice_number?: string; total: string; compra_fecha: string;
  movimiento_id: string; movimiento_fecha: string; amount: string; description: string;
};
type CashCutPendiente = {
  id: string; date: string; system_cash: string; counted_cash: string; difference: string; closed_by: string | null; closed_at: string;
};

function fmt(n: string | number) {
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

const cardStyle = { background: 'white', border: '2px solid #111', borderRadius: 12, padding: 18, boxShadow: '4px 4px 0 #111' } as const;

export default function ConciliacionPage() {
  const [movimientosPendientes, setMovimientosPendientes] = useState<Movimiento[]>([]);
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [sinSugerencia, setSinSugerencia] = useState<SinSugerencia[]>([]);
  const [conciliados, setConciliados] = useState<Conciliado[]>([]);
  const [cashCutsPendientes, setCashCutsPendientes] = useState<CashCutPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [manualPick, setManualPick] = useState<Record<string, string>>({});
  const [cashCutPick, setCashCutPick] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/contabilidad/conciliacion');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar la conciliación');
      setMovimientosPendientes(data.movimientos_pendientes ?? []);
      setSugerencias(data.sugerencias ?? []);
      setSinSugerencia(data.sin_sugerencia ?? []);
      setConciliados(data.conciliados ?? []);
      setCashCutsPendientes(data.cash_cuts_pendientes ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error de conexión al cargar la conciliación');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const usedMovementIds = new Set(sugerencias.map((s) => s.movimiento_id));
  const movimientosSinUsar = movimientosPendientes.filter((m) => !usedMovementIds.has(m.id));

  async function handleImport() {
    setImportError('');
    const lines = pasteText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const movements = [];
    // Se usa una expresión regular (en vez de un simple split por coma) porque
    // los importes suelen traer comas como separador de miles (ej. "1,250.50"):
    // un split ingenuo cortaría el importe a la mitad y guardaría un monto
    // incorrecto sin avisar. La fecha nunca lleva comas, así que se toma todo
    // lo anterior a la primera coma; el importe se reconoce como un número
    // (con comas de miles opcionales) inmediatamente después.
    const LINE_RE = /^([^,]+),\s*(-?[\d,]+(?:\.\d+)?)\s*,\s*(.+)$/;
    for (const line of lines) {
      const m = line.match(LINE_RE);
      if (!m) {
        setImportError(`Línea inválida (se esperan 3 columnas: fecha,importe,descripción): "${line}"`);
        return;
      }
      const [, dateRaw, amountRaw, description] = m;
      const date = dateRaw.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        setImportError(`Fecha inválida, usa formato AAAA-MM-DD: "${date}"`);
        return;
      }
      const amount = Number(amountRaw.replace(/,/g, ''));
      if (!Number.isFinite(amount)) {
        setImportError(`Importe inválido: "${amountRaw}"`);
        return;
      }
      movements.push({ date, amount, description: description.trim() });
    }
    setImporting(true);
    try {
      const res = await fetch('/api/admin/contabilidad/conciliacion/movimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movements }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar');
      setPasteText('');
      await load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setImporting(false);
    }
  }

  async function confirmar(compra_id: string, movimiento_id: string) {
    setBusyId(compra_id);
    setActionError('');
    try {
      const res = await fetch('/api/admin/contabilidad/conciliacion/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compra_id, movimiento_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo confirmar el cruce');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo confirmar el cruce');
    } finally {
      setBusyId(null);
    }
  }

  async function deshacer(compra_id: string) {
    setBusyId(compra_id);
    setActionError('');
    try {
      const res = await fetch('/api/admin/contabilidad/conciliacion/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compra_id, action: 'undo' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo deshacer el cruce');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo deshacer el cruce');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmarCaja(cash_cut_id: string, movimiento_id: string) {
    setBusyId(cash_cut_id);
    setActionError('');
    try {
      const res = await fetch('/api/admin/contabilidad/conciliacion/confirmar-caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cash_cut_id, movimiento_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo vincular el depósito');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo vincular el depósito');
    } finally {
      setBusyId(null);
    }
  }

  async function eliminarMovimiento(id: string) {
    if (!confirm('¿Eliminar este movimiento bancario importado?')) return;
    setBusyId(id);
    setActionError('');
    try {
      const res = await fetch(`/api/admin/contabilidad/conciliacion/movimientos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo eliminar el movimiento');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo eliminar el movimiento');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#111', margin: 0 }}>🏦 Conciliación Bancaria</h1>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
          Cruza automáticamente tus compras a proveedores contra los movimientos reales de tu banco, por nombre e importe.
        </p>
      </div>

      {loadError && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>{loadError}</span>
          <button onClick={load} style={{ fontSize: 12, fontWeight: 800, color: '#991b1b', background: 'white', border: '1px solid #dc2626', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Reintentar</button>
        </div>
      )}
      {actionError && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>{actionError}</span>
        </div>
      )}

      <div style={{ ...cardStyle, marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Importar movimientos bancarios</div>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
          Pega una línea por movimiento: <code>fecha,importe,descripción</code>. Ejemplo: <code>2026-09-15,1250.50,TRANSFERENCIA PROVEEDOR ABC</code>
        </p>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={5}
          placeholder={'2026-09-15,1250.50,TRANSFERENCIA PROVEEDOR ABC\n2026-09-14,340.00,PAGO SERVICIOS XYZ'}
          style={{ width: '100%', border: '2px solid #d1d5db', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: 'monospace', boxSizing: 'border-box' }}
        />
        {importError && <p style={{ color: '#dc2626', fontSize: 12, fontWeight: 700, marginTop: 6 }}>{importError}</p>}
        <button
          onClick={handleImport}
          disabled={importing || !pasteText.trim()}
          style={{ marginTop: 10, padding: '8px 18px', border: '2px solid #111', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '3px 3px 0 #111' }}
        >
          {importing ? 'Importando...' : 'Importar movimientos'}
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Cargando...</div>
      ) : loadError ? null : (
        <>
          <div style={{ fontWeight: 900, fontSize: 15, margin: '24px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            ✅ Sugerencias automáticas <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>({sugerencias.length})</span>
          </div>
          {sugerencias.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>Sin sugerencias por ahora.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sugerencias.map((s) => (
                <div key={s.compra_id} style={{ ...cardStyle, boxShadow: '3px 3px 0 #16a34a', borderColor: '#16a34a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>
                        {s.compra.supplier_name || 'Proveedor sin nombre'} {s.compra.invoice_number ? `· Factura ${s.compra.invoice_number}` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(s.compra.date)} · {fmt(s.compra.total)}</div>
                    </div>
                    <div style={{ fontSize: 16, color: '#16a34a' }}>⇄</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{s.movimiento.description}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(s.movimiento.date)} · {fmt(s.movimiento.amount)}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, margin: '10px 0 0' }}>{s.explicacion}</p>
                  <button
                    onClick={() => confirmar(s.compra_id, s.movimiento_id)}
                    disabled={busyId === s.compra_id}
                    style={{ marginTop: 10, padding: '7px 16px', border: '2px solid #111', borderRadius: 8, background: '#16a34a', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}
                  >
                    {busyId === s.compra_id ? 'Confirmando...' : 'Confirmar cruce'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 900, fontSize: 15, margin: '28px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⚠️ Compras sin coincidencia clara <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>({sinSugerencia.length})</span>
          </div>
          {sinSugerencia.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>Todas las compras pendientes tienen una sugerencia o ya están conciliadas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sinSugerencia.map((s) => (
                <div key={s.compra.id} style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>
                    {s.compra.supplier_name || 'Proveedor sin nombre'} {s.compra.invoice_number ? `· Factura ${s.compra.invoice_number}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{fmtDate(s.compra.date)} · {fmt(s.compra.total)}</div>
                  <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 10px' }}>{s.explicacion}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={manualPick[s.compra.id] ?? ''}
                      onChange={(e) => setManualPick((p) => ({ ...p, [s.compra.id]: e.target.value }))}
                      style={{ flex: 1, border: '2px solid #d1d5db', borderRadius: 8, padding: '7px 10px', fontSize: 12, background: 'white' }}
                    >
                      <option value="">Elegir movimiento manualmente...</option>
                      {movimientosSinUsar.map((m) => (
                        <option key={m.id} value={m.id}>{fmtDate(m.date)} · {fmt(m.amount)} · {m.description}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => manualPick[s.compra.id] && confirmar(s.compra.id, manualPick[s.compra.id])}
                      disabled={!manualPick[s.compra.id] || busyId === s.compra.id}
                      style={{ padding: '7px 14px', border: '2px solid #111', borderRadius: 8, background: '#111', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Conciliar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 900, fontSize: 15, margin: '28px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            💰 Cortes de caja por vincular al banco <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>({cashCutsPendientes.length})</span>
          </div>
          {cashCutsPendientes.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No hay cortes de caja cerrados pendientes de vincular a un depósito.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cashCutsPendientes.map((c) => (
                <div key={c.id} style={cardStyle}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>Corte de caja del {fmtDate(c.date)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                    Efectivo contado: {fmt(c.counted_cash)} · Diferencia: {fmt(c.difference)} · Cerrado por {c.closed_by || '—'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={cashCutPick[c.id] ?? ''}
                      onChange={(e) => setCashCutPick((p) => ({ ...p, [c.id]: e.target.value }))}
                      style={{ flex: 1, border: '2px solid #d1d5db', borderRadius: 8, padding: '7px 10px', fontSize: 12, background: 'white' }}
                    >
                      <option value="">Elegir movimiento del depósito...</option>
                      {movimientosSinUsar.map((m) => (
                        <option key={m.id} value={m.id}>{fmtDate(m.date)} · {fmt(m.amount)} · {m.description}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => cashCutPick[c.id] && confirmarCaja(c.id, cashCutPick[c.id])}
                      disabled={!cashCutPick[c.id] || busyId === c.id}
                      style={{ padding: '7px 14px', border: '2px solid #111', borderRadius: 8, background: '#111', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Vincular
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 900, fontSize: 15, margin: '28px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            📄 Movimientos bancarios sin usar <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>({movimientosSinUsar.length})</span>
          </div>
          {movimientosSinUsar.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0' }}>No hay movimientos importados sin usar.</div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {movimientosSinUsar.map((m, i) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{m.description}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 8 }}>{fmtDate(m.date)} · {fmt(m.amount)}</span>
                  </div>
                  <button
                    onClick={() => eliminarMovimiento(m.id)}
                    disabled={busyId === m.id}
                    style={{ background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '5px 8px', fontSize: 12, color: '#dc2626' }}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontWeight: 900, fontSize: 15, margin: '28px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔗 Conciliados <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>({conciliados.length})</span>
          </div>
          {conciliados.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: '12px 0 40px' }}>Aún no has confirmado ningún cruce.</div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', marginBottom: 40 }}>
              {conciliados.map((c, i) => (
                <div key={c.compra_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: 12 }}>
                    <b>{c.supplier_name || 'Proveedor'}</b> {c.invoice_number ? `· Factura ${c.invoice_number}` : ''} ({fmt(c.total)})
                    <span style={{ color: '#9ca3af' }}> ⇄ {c.description} ({fmt(c.amount)})</span>
                  </div>
                  <button
                    onClick={() => deshacer(c.compra_id)}
                    disabled={busyId === c.compra_id}
                    style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '5px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280' }}
                  >
                    Deshacer
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
