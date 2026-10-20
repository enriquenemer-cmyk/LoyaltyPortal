'use client';

import { useEffect, useRef } from 'react';

type Props = {
  url: string;
  productName: string;
  weight: string;
  unit: string;
  orderNumber: string;
  size?: number;
};

export default function UnitQRLabel({ url, productName, weight, unit, orderNumber, size = 120 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      const QRCodeStyling = (await import('qr-code-styling')).default;
      if (cancelled || !container) return;
      container.innerHTML = '';
      const qr = new QRCodeStyling({
        width: size,
        height: size,
        type: 'svg',
        data: url,
        dotsOptions: { type: 'square', color: 'var(--apple-label)' },
        cornersSquareOptions: { type: 'square', color: 'var(--apple-label)' },
        cornersDotOptions: { type: 'square', color: 'var(--apple-label)' },
        backgroundOptions: { color: '#ffffff' },
        qrOptions: { errorCorrectionLevel: 'M' },
      });
      if (!cancelled) qr.append(container);
    })();

    return () => { cancelled = true; };
  }, [url, size]);

  return (
    <div
      className="inventory-unit-label"
      style={{ border: '0.5px solid var(--apple-sep)', borderRadius: 12, padding: 12, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'var(--apple-bg-2)', width: size + 24 }}
    >
      <div ref={containerRef} style={{ width: size, height: size }} />
      <p style={{ fontWeight: 800, fontSize: 12, color: 'var(--apple-label)', textAlign: 'center', margin: 0 }}>{productName}</p>
      <p style={{ fontWeight: 900, fontSize: 16, color: '#F97316', margin: 0 }}>{weight} {unit}</p>
      <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>Pedido #{orderNumber}</p>
    </div>
  );
}
