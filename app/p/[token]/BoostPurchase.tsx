'use client';
import { BoltIcon } from '@heroicons/react/24/outline';

import { useState } from 'react';

export default function BoostPurchase({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/boost-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, days: 7, multiplier: 2 }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? 'No se pudo iniciar el pago. Intenta de nuevo.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleBuy}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid #C0DD97',
          background: '#EAF3DE',
          color: '#3B6D11',
          fontSize: 12,
          fontWeight: 800,
          cursor: loading ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: loading ? 0.6 : 1,
        }}
      >
        <BoltIcon className="w-4 h-4 inline-block align-middle" aria-hidden="true" />
        {loading ? 'Abriendo pago…' : 'Activar 2× puntos por 7 días — $29 MXN'}
      </button>
      {error && (
        <p style={{ fontSize: 11, color: '#dc2626', margin: '6px 0 0', textAlign: 'center' }}>{error}</p>
      )}
    </div>
  );
}
