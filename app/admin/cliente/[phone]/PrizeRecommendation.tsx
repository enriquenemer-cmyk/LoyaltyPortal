'use client';
import { CpuChipIcon, SparklesIcon } from '@heroicons/react/24/outline';

import { useState } from 'react';

export function PrizeRecommendation({ phone }: { phone: string }) {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState('');
  const [error, setError] = useState('');

  async function handleGenerate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/ai/recommend-prize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.recommendation) {
        setError(data.error ?? 'No se pudo generar la recomendación, intenta de nuevo');
        return;
      }
      setRecommendation(data.recommendation);
    } catch {
      setError('No se pudo generar la recomendación, intenta de nuevo');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] p-5">
      <h2 className="text-sm font-extrabold text-[#1C1917] uppercase tracking-wider mb-3"><CpuChipIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Recomendación IA</h2>

      {!recommendation && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#2563EB] hover:bg-[#0891B2] transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span><SparklesIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
          )}
          {loading ? 'Generando...' : 'Generar recomendación'}
        </button>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

      {recommendation && (
        <div className="mt-1">
          <p className="text-sm text-[#1C1917] bg-[#FAFAF9] border border-[#E8E3DC] rounded-xl px-4 py-3 leading-relaxed">
            {recommendation}
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-3 text-xs font-bold text-[#2563EB] hover:underline disabled:opacity-40"
          >
            {loading ? 'Generando...' : 'Generar de nuevo'}
          </button>
        </div>
      )}
    </div>
  );
}
