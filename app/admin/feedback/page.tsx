'use client';
import { ChatBubbleLeftRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useEffect, useState } from 'react';

type FeedbackEntry = {
  id: string;
  action: string;
  description: string;
  created_at: string;
  metadata: { stars?: number; comment?: string; ticket_claim_id?: string } | null;
};

function StarBar({ value, max, count }: { value: number; max: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-4 text-stone-500">{value}★</span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400"
          style={{ width: max > 0 ? `${(count / max) * 100}%` : '0%' }}
        />
      </div>
      <span className="text-xs text-stone-500 w-6 text-right">{count}</span>
    </div>
  );
}

export default function FeedbackPage() {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/activity-log?action=ticket_feedback&limit=200')
      .then(r => r.json())
      .then(d => setEntries(d.entries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const withStars = entries.filter(e => e.metadata?.stars);
  const avg = withStars.length
    ? withStars.reduce((s, e) => s + (e.metadata?.stars ?? 0), 0) / withStars.length
    : 0;

  const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  withStars.forEach(e => { const s = e.metadata?.stars ?? 0; if (s >= 1 && s <= 5) dist[s]++; });
  const maxDist = Math.max(...Object.values(dist), 1);

  const withComments = entries.filter(e => e.metadata?.comment?.trim());

  return (
    <div className="min-h-screen">
      <div className="hero-gradient px-4 md:px-10 pt-6 pb-8">
        <div className="hero-blobs" aria-hidden="true"><span key="b1" /><span key="b2" /><span key="b3" /></div>
        <div className="max-w-4xl mx-auto flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(219,234,254,0.9)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <ChatBubbleLeftRightIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Feedback
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Feedback</h1>
            <p className="text-blue-200/70 mt-1.5 text-sm">Calificaciones y comentarios post-visita de los tickets escaneados</p>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 md:px-10 py-6">

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-4">
            <p className="text-2xl font-extrabold text-amber-500 tabular-nums">{avg > 0 ? avg.toFixed(1) : '—'} ★</p>
            <p className="text-xs text-stone-500 mt-1">Calificación promedio</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-4">
            <p className="text-2xl font-extrabold text-[#1C1917] tabular-nums">{withStars.length}</p>
            <p className="text-xs text-stone-500 mt-1">Calificaciones totales</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-4">
            <p className="text-2xl font-extrabold text-[#1C1917] tabular-nums">{withComments.length}</p>
            <p className="text-xs text-stone-500 mt-1">Con comentario</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Distribution */}
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-5">
            <h2 className="text-sm font-bold text-[#1C1917] mb-4">Distribución de calificaciones</h2>
            {loading ? (
              <p className="text-stone-400 text-sm">Cargando...</p>
            ) : withStars.length === 0 ? (
              <p className="text-stone-400 text-sm">Sin calificaciones aún.</p>
            ) : (
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(s => (
                  <StarBar key={s} value={s} max={maxDist} count={dist[s]} />
                ))}
              </div>
            )}
          </div>

          {/* Recent comments */}
          <div className="bg-white rounded-2xl border border-[#E8E3DC] p-5">
            <h2 className="text-sm font-bold text-[#1C1917] mb-4">Comentarios recientes</h2>
            {loading ? (
              <p className="text-stone-400 text-sm">Cargando...</p>
            ) : withComments.length === 0 ? (
              <p className="text-stone-400 text-sm">Sin comentarios aún.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {withComments.slice(0, 20).map(e => (
                  <div key={e.id} className="border-b border-[#F3EFE9] pb-2 last:border-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-amber-500 text-xs">{'★'.repeat(e.metadata?.stars ?? 0)}</span>
                      <span className="text-xs text-stone-400">
                        {new Date(e.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-[#1C1917]">{e.metadata?.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Low-rating alerts */}
        {withStars.filter(e => (e.metadata?.stars ?? 5) <= 2).length > 0 && (
          <div className="bg-red-50 rounded-2xl border border-red-200 p-5">
            <h2 className="text-sm font-bold text-red-800 mb-3"><ExclamationTriangleIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> Visitas con calificación baja (1–2 ★)</h2>
            <div className="space-y-2">
              {withStars.filter(e => (e.metadata?.stars ?? 5) <= 2).slice(0, 10).map(e => (
                <div key={e.id} className="flex items-start gap-3">
                  <span className="text-red-500 shrink-0">{'★'.repeat(e.metadata?.stars ?? 0)}</span>
                  <div>
                    <p className="text-sm text-red-900">{e.metadata?.comment ?? 'Sin comentario'}</p>
                    <p className="text-xs text-red-400">
                      {new Date(e.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
