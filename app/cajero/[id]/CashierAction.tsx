'use client';

import { useState } from 'react';

type Props = { claimId: string; prizeName: string; defaultCajero?: string };

export default function CashierAction({ claimId, prizeName, defaultCajero = '' }: Props) {
  const [name, setName] = useState(defaultCajero);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleDeliver() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivered_by: name.trim() || 'Cajero' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al confirmar.'); return; }
      setDone(true);
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/40">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-extrabold text-white mb-2">¡Premio Entregado!</h3>
        <p className="text-white/60 text-sm">
          Se registró la entrega de <strong className="text-white">{prizeName}</strong>. El cobro quedó guardado en el sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-white/70 text-sm font-medium mb-1.5">Tu nombre (cajero que entrega)</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Carlos Méndez"
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/50 transition-all"
        />
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      <button
        onClick={handleDeliver}
        disabled={loading}
        className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg shadow-orange-500/30 text-base tracking-wide"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Confirmando...
          </span>
        ) : '✓ Confirmar Entrega del Premio'}
      </button>
      <p className="text-white/30 text-xs text-center">Esta acción es irreversible y queda registrada en el sistema</p>
    </div>
  );
}
