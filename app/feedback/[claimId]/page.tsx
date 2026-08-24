'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';

export default function FeedbackPage() {
  const params = useParams();
  const claimId = params.claimId as string;

  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/ticket-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stars: rating,
          comment: comment.trim() || null,
          ticket_claim_id: claimId,
          restaurant_id: null, // server may derive from claim_id if needed
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error al enviar');
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setSubmitting(false);
    }
  }

  const starLabels = ['', 'Muy mal', 'Malo', 'Regular', 'Bueno', 'Excelente'];

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-sm w-full text-center animate-[fadeInUp_0.5s_ease]">
          {/* Animated checkmark */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
          >
            <svg
              className="w-10 h-10 text-white animate-[scaleIn_0.4s_ease_0.2s_both]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1C1917] mb-2">¡Gracias!</h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            Tu opinión nos ayuda a mejorar. Nos alegra que nos hayas visitado y esperamos verte pronto.
          </p>
          <div className="mt-6 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                className={`w-6 h-6 transition-all ${s <= rating ? 'text-amber-400' : 'text-stone-200'}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            ))}
          </div>
        </div>
        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.5); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF7ED] to-[#FFEDD5] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1C1917]">¿Cómo fue tu experiencia?</h1>
          <p className="text-stone-400 text-sm mt-1">Tu opinión nos importa mucho</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stars */}
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  aria-label={`${s} estrellas`}
                >
                  <svg
                    className={`w-10 h-10 transition-colors ${
                      s <= (hovered || rating) ? 'text-amber-400' : 'text-stone-200'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>
              ))}
            </div>
            {(hovered || rating) > 0 && (
              <p className="text-sm font-semibold text-[#F97316] h-5 transition-all">
                {starLabels[hovered || rating]}
              </p>
            )}
            {(hovered || rating) === 0 && <p className="text-sm text-stone-300 h-5">Selecciona una calificación</p>}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              ¿Algo más que quieras decirnos?
              <span className="ml-1 text-stone-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tu comentario aquí..."
              rows={3}
              className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm text-[#1C1917] placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316] resize-none transition-all"
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={rating === 0 || submitting}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Enviando...
              </span>
            ) : (
              'Enviar calificación'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
