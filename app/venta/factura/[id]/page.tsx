'use client';
import { useEffect, useState, use } from 'react';

type SaleItem = { product_name: string; product_type: string; unit: string; quantity: string; unit_price: string; subtotal: string };
type SalePayment = { method: string; amount: string };
type Sale = {
  id: string; total_amount: string; payment_method: string; employee_name: string | null;
  cancelled_at: string | null; created_at: string; table_name: string | null;
  restaurant_name: string | null; restaurant_address: string | null; restaurant_phone: string | null; restaurant_logo: string | null;
  items: SaleItem[]; payments: SalePayment[];
};

const PAYMENT_LABELS: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', otro: 'Otro', dividida: 'Cuenta dividida' };

function fmt(n: string | number) {
  return Number(n).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

export default function FacturaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ticketMode, setTicketMode] = useState(false);
  const [ticketWidth, setTicketWidth] = useState<58 | 80>(80);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/pos/sale/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la factura');
        setSale(data.sale);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la factura');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontFamily: 'sans-serif' }}>Cargando factura...</div>;
  }
  if (error || !sale) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontFamily: 'sans-serif' }}>{error || 'Factura no encontrada'}</div>;
  }

  const fecha = new Date(sale.created_at);
  const folio = sale.id.slice(0, 8).toUpperCase();

  if (ticketMode) {
    const widthMm = ticketWidth;
    const widthPx = widthMm === 80 ? 302 : 219;
    return (
      <div style={{ background: '#f3f4f6', minHeight: '100vh', padding: '24px 12px' }}>
        <style>{`
          @page { size: ${widthMm}mm auto; margin: 2mm; }
          @media print {
            body { background: white !important; }
            .no-print { display: none !important; }
            .ticket-sheet { box-shadow: none !important; margin: 0 !important; border: none !important; }
          }
        `}</style>

        <div className="no-print" style={{ maxWidth: 400, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setTicketMode(false)} style={{ padding: '8px 14px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📄 Factura formal</button>
            <button onClick={() => setTicketWidth(58)} style={{ padding: '8px 12px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: ticketWidth === 58 ? '#111' : 'white', color: ticketWidth === 58 ? 'white' : '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>58mm</button>
            <button onClick={() => setTicketWidth(80)} style={{ padding: '8px 12px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: ticketWidth === 80 ? '#111' : 'white', color: ticketWidth === 80 ? 'white' : '#111', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>80mm</button>
          </div>
          <button onClick={() => window.print()} style={{ padding: '9px 20px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: 'var(--apple-shadow-1)' }}>
            🖨️ Imprimir ticket
          </button>
        </div>

        <div className="ticket-sheet" style={{ width: widthPx, margin: '0 auto', background: 'white', border: '1px solid #e5e7eb', padding: '10px 8px', fontFamily: 'monospace', color: 'var(--apple-label)', fontSize: 11 }}>
          <div style={{ textAlign: 'center', marginBottom: 6 }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>{sale.restaurant_name || 'Mi Restaurante'}</div>
            {sale.restaurant_address && <div>{sale.restaurant_address}</div>}
            {sale.restaurant_phone && <div>{sale.restaurant_phone}</div>}
          </div>
          <div style={{ borderTop: '1px dashed #111', borderBottom: '1px dashed #111', padding: '4px 0', margin: '6px 0' }}>
            <div>Folio: {folio}</div>
            <div>{fecha.toLocaleDateString('es-CO')} {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
            {sale.table_name && <div>Mesa: {sale.table_name}</div>}
            <div>Atiende: {sale.employee_name || '—'}</div>
            {sale.cancelled_at && <div style={{ fontWeight: 900 }}>*** ANULADA ***</div>}
          </div>
          {sale.items.map((it, i) => (
            <div key={i} style={{ marginBottom: 3 }}>
              <div>{it.product_name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{Number(it.quantity)} {it.unit} x {fmt(it.unit_price)}</span>
                <span>{fmt(it.subtotal)}</span>
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px dashed #111', marginTop: 6, paddingTop: 6 }}>
            {sale.payments.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{PAYMENT_LABELS[p.method] || p.method}</span>
                <span>{fmt(p.amount)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 13, marginTop: 2 }}>
              <span>TOTAL</span>
              <span>{fmt(sale.total_amount)}</span>
            </div>
            {sale.payments.length === 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#374151' }}>
                <span>{PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</span>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 10 }}>¡Gracias por tu compra!</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f3f4f6', minHeight: '100vh', padding: '24px 12px' }}>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .invoice-sheet { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: 620, margin: '0 auto 16px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          onClick={() => setTicketMode(true)}
          style={{ padding: '9px 20px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: 'white', color: 'var(--apple-label)', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
        >
          🎫 Vista ticket térmico
        </button>
        <button
          onClick={() => window.print()}
          style={{ padding: '9px 20px', border: '0.5px solid var(--apple-sep)', borderRadius: 8, background: '#F97316', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: 'var(--apple-shadow-1)' }}
        >
          🖨️ Imprimir factura
        </button>
      </div>

      <div
        className="invoice-sheet"
        style={{ maxWidth: 620, margin: '0 auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '36px 40px', fontFamily: 'sans-serif', color: '#111827' }}
      >
        {/* Header: branding — placeholder listo para el logo/sello propio de cada negocio */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111827', paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {sale.restaurant_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sale.restaurant_logo} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'contain', border: '1px solid #e5e7eb' }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: 8, border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9ca3af', textAlign: 'center' }}>
                Sello
              </div>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>{sale.restaurant_name || 'Mi Restaurante'}</div>
              {sale.restaurant_address && <div style={{ fontSize: 11, color: '#6b7280' }}>{sale.restaurant_address}</div>}
              {sale.restaurant_phone && <div style={{ fontSize: 11, color: '#6b7280' }}>{sale.restaurant_phone}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 1 }}>FACTURA</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Folio #{folio}</div>
            {sale.cancelled_at && (
              <div style={{ marginTop: 6, display: 'inline-block', fontSize: 10, fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 999 }}>
                ANULADA
              </div>
            )}
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 20 }}>
          <div>
            <div><b>Fecha:</b> {fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            <div><b>Hora:</b> {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><b>Atendido por:</b> {sale.employee_name || '—'}</div>
            {sale.table_name && <div><b>Mesa:</b> {sale.table_name}</div>}
            <div><b>Método de pago:</b> {PAYMENT_LABELS[sale.payment_method] || sale.payment_method}</div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #111827' }}>
              <th style={{ textAlign: 'left', padding: '6px 0', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Artículo</th>
              <th style={{ textAlign: 'center', padding: '6px 0', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Cant.</th>
              <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>P. Unit.</th>
              <th style={{ textAlign: 'right', padding: '6px 0', fontSize: 11, textTransform: 'uppercase', color: '#6b7280' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '8px 0' }}>{it.product_name}</td>
                <td style={{ padding: '8px 0', textAlign: 'center' }}>{Number(it.quantity)} {it.unit}</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{fmt(it.unit_price)}</td>
                <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 700 }}>{fmt(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <div style={{ minWidth: 220 }}>
            {sale.payments.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {sale.payments.map((p, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', padding: '2px 0' }}>
                    <span>{PAYMENT_LABELS[p.method] || p.method}</span>
                    <span>{fmt(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 900, borderTop: '2px solid #111827', paddingTop: 8 }}>
              <span>TOTAL</span>
              <span>{fmt(sale.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px dashed #d1d5db', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
          ¡Gracias por tu compra!
        </div>
      </div>
    </div>
  );
}
