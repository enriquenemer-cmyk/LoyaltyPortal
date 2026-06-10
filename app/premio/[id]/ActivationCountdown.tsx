'use client';
import { useEffect, useState } from 'react';

function formatActivationDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

type Props = {
  activateAt: string; // ISO timestamp
  children: React.ReactNode;
};

export default function ActivationCountdown({ activateAt, children }: Props) {
  const [remaining, setRemaining] = useState<number>(() => new Date(activateAt).getTime() - Date.now());

  useEffect(() => {
    const tick = () => {
      const diff = new Date(activateAt).getTime() - Date.now();
      setRemaining(diff);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [activateAt]);

  if (remaining > 0) {
    return (
      <div style={{
        background: 'white', borderRadius: 28, padding: 40, textAlign: 'center',
        maxWidth: 360, width: '100%', boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        margin: '0 auto',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⏳</div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111', marginBottom: 8 }}>
          Premio próximamente
        </h2>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          Este premio se activará el{' '}
          <strong style={{ color: '#2563EB' }}>{formatActivationDate(activateAt)}</strong>.
        </p>
        <div style={{
          display: 'inline-block',
          background: '#EFF6FF',
          border: '1px solid #BAE6FD',
          borderRadius: 16,
          padding: '12px 24px',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>
            Tiempo restante
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>
            {formatRemaining(remaining)}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
