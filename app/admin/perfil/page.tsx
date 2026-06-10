'use client';

import { useState } from 'react';

export default function PerfilPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (next !== confirm) {
      setMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'success', text: data.message ?? 'Contraseña actualizada.' });
        setCurrent(''); setNext(''); setConfirm('');
      } else if (data.message) {
        setMessage({ type: 'info', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Error al cambiar la contraseña.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full bg-white border border-[#E8E3DC] rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm';

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <div className="max-w-lg mx-auto px-4 py-10">

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-stone-100 text-stone-700 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 border border-stone-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mi Perfil
          </div>
          <h1 className="text-3xl font-extrabold text-[#1C1917] tracking-tight border-l-4 border-[#2563EB] pl-4">
            Cambiar <span className="gradient-text">Contraseña</span>
          </h1>
          <p className="text-stone-500 mt-2 text-sm pl-4">Actualiza la contraseña de tu cuenta.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E8E3DC] shadow-[0_1px_2px_rgba(28,25,23,0.04),_0_4px_16px_rgba(28,25,23,0.06)] overflow-hidden" style={{ borderTop: '3px solid #2563EB' }}>
          <div className="p-6 border-b border-[#E8E3DC]">
            <h2 className="text-base font-bold text-[#1C1917]">Seguridad de la cuenta</h2>
            <p className="text-xs text-stone-400 mt-0.5">Mínimo 8 caracteres para la nueva contraseña.</p>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña actual</label>
              <input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                required
                placeholder="Tu contraseña actual"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirmar nueva contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                placeholder="Repite la nueva contraseña"
                className={inputClass}
              />
            </div>

            {message && (
              <div className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2 ${
                message.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                message.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
                'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {message.type === 'success'
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                </svg>
                <span className="leading-relaxed">{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-black py-3.5 rounded-2xl transition-all text-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#2563EB,#0891B2)', boxShadow: loading ? 'none' : '0 8px 24px rgba(37,99,235,0.35)' }}
            >
              {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
