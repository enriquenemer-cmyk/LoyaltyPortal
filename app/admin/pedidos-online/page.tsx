'use client';
import { useEffect, useState } from 'react';

type OrderItem = { product_name: string; quantity: string; unit: string; subtotal: string };
type Order = {
  id: string; customer_name: string; customer_phone: string; delivery_type: string; address: string | null;
  notes: string | null; status: string; total_amount: string; rejection_reason: string | null;
  created_at: string; items: OrderItem[];
};

function fmt(n: string | number) {
  return Number(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
}

// No hay cuenta de WhatsApp Business API configurada, así que en vez de
// enviar automático, se abre WhatsApp con el mensaje ya escrito para que el
// staff lo mande con un clic — cero costo, cero cuenta nueva necesaria.
function whatsappLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
const STATUS_MESSAGES: Record<string, (name: string) => string> = {
  confirmado: (name) => `Hola ${name}, tu pedido fue confirmado y ya lo estamos preparando 🎉`,
  preparando: (name) => `Hola ${name}, tu pedido ya se está preparando 👨‍🍳`,
  listo: (name) => `Hola ${name}, ¡tu pedido ya está listo! 📦`,
  entregado: (name) => `Hola ${name}, ¡gracias por tu compra! 🎉`,
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: '#fef9c3', color: '#ca8a04', label: '⏳ Pendiente' },
  confirmado: { bg: '#dbeafe', color: '#2563eb', label: '✅ Confirmado' },
  preparando: { bg: '#fed7aa', color: '#ea580c', label: '👨‍🍳 Preparando' },
  listo: { bg: '#dcfce7', color: '#16a34a', label: '📦 Listo' },
  entregado: { bg: '#e5e7eb', color: '#374151', label: '🎉 Entregado' },
  cancelado: { bg: '#fee2e2', color: '#dc2626', label: '✕ Cancelado' },
};

const cardStyle = { background: 'var(--apple-bg-2)', border: '0.5px solid var(--apple-sep)', borderRadius: 12, padding: 16, boxShadow: 'var(--apple-shadow-2)' } as const;

export default function PedidosOnlinePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/pedidos-online');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudieron cargar los pedidos');
      setOrders(data.orders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  async function confirmar(id: string) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/pedidos-online/${id}/confirmar`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo confirmar el pedido');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el pedido');
    } finally {
      setBusyId(null);
    }
  }

  async function rechazar(id: string) {
    const reason = prompt('¿Por qué se rechaza este pedido? (opcional)') ?? '';
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/pedidos-online/${id}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo rechazar el pedido');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo rechazar el pedido');
    } finally {
      setBusyId(null);
    }
  }

  async function avanzar(id: string, status: string) {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/pedidos-online/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el pedido');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el pedido');
    } finally {
      setBusyId(null);
    }
  }

  const active = orders.filter((o) => !['entregado', 'cancelado'].includes(o.status));
  const done = orders.filter((o) => ['entregado', 'cancelado'].includes(o.status));

  return (
    <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--apple-label)', margin: 0 }}>🛍️ Pedidos en Línea</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Comparte <code>/pedidos</code> con tus clientes para que ordenen desde su celular.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '2px solid #dc2626', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 30 }}>Cargando...</div>
      ) : (
        <>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 10 }}>Activos ({active.length})</div>
          {active.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, marginBottom: 24 }}>Sin pedidos activos.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
              {active.map((o) => {
                const st = STATUS_STYLE[o.status] ?? { bg: '#f3f4f6', color: '#374151', label: o.status };
                return (
                  <div key={o.id} style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14 }}>{o.customer_name} · {o.customer_phone}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                          {o.delivery_type === 'delivery' ? `🛵 A domicilio — ${o.address}` : '🏃 Para llevar'} · {new Date(o.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {o.notes && <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>&ldquo;{o.notes}&rdquo;</div>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#374151', marginBottom: 10 }}>
                      {o.items.map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{Number(it.quantity)}× {it.product_name}</span>
                          <span style={{ fontWeight: 700 }}>{fmt(it.subtotal)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, borderTop: '1px solid #f3f4f6', marginTop: 4, paddingTop: 4 }}>
                        <span>Total</span>
                        <span>{fmt(o.total_amount)}</span>
                      </div>
                    </div>

                    {STATUS_MESSAGES[o.status] && (
                      <a
                        href={whatsappLink(o.customer_phone, STATUS_MESSAGES[o.status](o.customer_name))}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', textAlign: 'center', width: '100%', padding: '7px 0', border: '2px solid #16a34a', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontWeight: 800, fontSize: 11, marginBottom: 8, textDecoration: 'none' }}
                      >
                        💬 Avisar por WhatsApp
                      </a>
                    )}

                    {o.status === 'pendiente' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => confirmar(o.id)} disabled={busyId === o.id} style={{ flex: 1, padding: '8px 0', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#16a34a', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                          ✓ Confirmar
                        </button>
                        <button onClick={() => rechazar(o.id)} disabled={busyId === o.id} style={{ flex: 1, padding: '8px 0', border: '2px solid #d1d5db', borderRadius: 8, background: 'var(--apple-bg-2)', color: '#dc2626', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                          ✕ Rechazar
                        </button>
                      </div>
                    )}
                    {o.status === 'confirmado' && (
                      <button onClick={() => avanzar(o.id, 'preparando')} disabled={busyId === o.id} style={{ width: '100%', padding: '8px 0', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                        👨‍🍳 Marcar en preparación
                      </button>
                    )}
                    {o.status === 'preparando' && (
                      <button onClick={() => avanzar(o.id, 'listo')} disabled={busyId === o.id} style={{ width: '100%', padding: '8px 0', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#2563eb', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                        📦 Marcar como listo
                      </button>
                    )}
                    {o.status === 'listo' && (
                      <button onClick={() => avanzar(o.id, 'entregado')} disabled={busyId === o.id} style={{ width: '100%', padding: '8px 0', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#16a34a', color: 'white', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                        🎉 Marcar como entregado
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 10 }}>Historial reciente ({done.length})</div>
          {done.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Sin pedidos finalizados todavía.</div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              {done.map((o, i) => {
                const st = STATUS_STYLE[o.status] ?? { bg: '#f3f4f6', color: '#374151', label: o.status };
                return (
                  <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 12 }}>
                      <b>{o.customer_name}</b> · {fmt(o.total_amount)}
                      {o.rejection_reason && <span style={{ color: '#dc2626' }}> — {o.rejection_reason}</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
