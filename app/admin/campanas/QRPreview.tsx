'use client';

import { useEffect, useRef } from 'react';

type CampaignStyle = {
  qr_dot_color: string;
  qr_background: string;
  qr_dot_style: string;
  qr_corner_style: string;
  qr_gradient_end: string | null;
};

type Props = {
  url?: string;
  style: CampaignStyle;
  size?: number;
};

export default function QRPreview({ url = 'https://premia.tierra/preview', style, size = 120 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      const QRCodeStyling = (await import('qr-code-styling')).default;
      if (cancelled || !container) return;

      container.innerHTML = '';

      const dotOptions: Record<string, unknown> = style.qr_gradient_end
        ? {
            type: style.qr_dot_style,
            gradient: {
              type: 'linear',
              rotation: 45,
              colorStops: [
                { offset: 0, color: style.qr_dot_color },
                { offset: 1, color: style.qr_gradient_end },
              ],
            },
          }
        : { type: style.qr_dot_style, color: style.qr_dot_color };

      const qr = new QRCodeStyling({
        width: size,
        height: size,
        type: 'svg',
        data: url,
        dotsOptions: dotOptions as Parameters<typeof QRCodeStyling.prototype.update>[0] extends undefined ? never : never,
        cornersSquareOptions: { type: style.qr_corner_style as 'square' | 'extra-rounded' | 'dot', color: style.qr_dot_color },
        cornersDotOptions: { type: 'dot', color: style.qr_dot_color },
        backgroundOptions: { color: style.qr_background },
        qrOptions: { errorCorrectionLevel: 'M' },
      });

      if (!cancelled) {
        qr.append(container);
      }
    })();

    return () => { cancelled = true; };
  }, [url, size, style.qr_dot_color, style.qr_background, style.qr_dot_style, style.qr_corner_style, style.qr_gradient_end]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}
    />
  );
}
