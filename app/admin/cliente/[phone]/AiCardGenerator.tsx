'use client';
import { PaintBrushIcon } from '@heroicons/react/24/outline';

import { useState } from 'react';

const LOADING_MESSAGES = [
  'Creando tu obra de arte...',
  'Mezclando colores únicos...',
  'Dibujando patrones exclusivos...',
  'Puliendo los detalles finales...',
];

export function AiCardGenerator({ phone, tier }: { phone: string; tier: string }) {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);

  async function handleGenerate() {
    setLoading(true);
    setError('');

    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, 3000);

    try {
      const res = await fetch('/api/admin/ai/generate-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.image_url) {
        setError(data.error ?? 'No se pudo generar la tarjeta, intenta de nuevo');
        return;
      }
      setImageUrl(data.image_url);
      setIsNew(Boolean(data.is_new));
    } catch {
      setError('No se pudo generar la tarjeta, intenta de nuevo');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] p-5">
      <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-wider mb-3">
        <PaintBrushIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Tarjeta Coleccionable IA
        {(tier === 'gold' || tier === 'silver') && (
          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-300 align-middle">
            VIP
          </span>
        )}
      </h2>

      {!imageUrl && !loading && (
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#2563EB] hover:bg-[#0891B2] transition-all shadow-sm"
        >
          <span><PaintBrushIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
          Generar Tarjeta IA
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <div className="w-5 h-5 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          {loadingMsg}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {imageUrl && !loading && (
        <div className="mt-1">
          {!isNew && (
            <p className="text-xs text-stone-400 mb-2">
              Ya existe una tarjeta generada en los últimos 30 días — se reutilizó.
            </p>
          )}
          <img
            src={imageUrl}
            alt="Tarjeta coleccionable generada por IA"
            className="w-full max-w-xs rounded-2xl border border-[#E8E3DC] shadow-md"
          />
          <button
            onClick={handleGenerate}
            className="mt-3 text-xs font-bold text-[#2563EB] hover:underline"
          >
            Ver de nuevo / regenerar
          </button>
        </div>
      )}
    </div>
  );
}
