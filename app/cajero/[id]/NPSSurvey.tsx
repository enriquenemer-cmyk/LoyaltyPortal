'use client';

import { useState } from 'react';

type Props = {
  claimId: string;
  onSkip?: () => void;
};

export default function NPSSurvey({ claimId, onSkip }: Props) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setLoading(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: claimId, rating, comment: comment.trim() || null }),
      });
      setSubmitted(true);
    } catch {
      // still show success to avoid blocking UX
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 text-center">
        <p className="text-2xl mb-1">🧡</p>
        <p className="font-bold text-[#1C1917]">¡Gracias por tu opinión!</p>
      </div>
    );
  }

  const display = hovered || rating;

  return (
    <div className="bg-white border border-[#E8E3DC] rounded-2xl p-5 space-y-4">
      <div>
        <p className="font-bold text-[#1C1917] text-sm mb-0.5">¿Cómo fue tu experiencia?</p>
        <p className="text-xs text-stone-400">Tu opinión nos ayuda a mejorar</p>
      </div>

      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="text-3xl transition-transform hover:scale-110 active:scale-95"
            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          >
            <span style={{ color: star <= display ? '#f97316' : '#d6d3d1' }}>★</span>
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comentario opcional..."
        rows={2}
        className="w-full bg-stone-50 border border-[#E8E3DC] rounded-xl px-4 py-3 text-[#1C1917] placeholder-stone-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={rating === 0 || loading}
          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-40 text-white font-bold py-3 rounded-xl transition-all text-sm"
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
        <button
          onClick={onSkip}
          className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 transition-colors"
        >
          Omitir
        </button>
      </div>
    </div>
  );
}
