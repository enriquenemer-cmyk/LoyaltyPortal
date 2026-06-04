'use client';

import { useState } from 'react';

type Props = {
  prizeId: string;
  location: string;
};

export default function ClaimForm({ prizeId, location }: Props) {
  const [form, setForm] = useState({ full_name: '', phone: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prize_id: prizeId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al registrar.'); return; }
      setSuccess(true);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-emerald-400/20 border-2 border-emerald-400/50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-extrabold text-white mb-2">¡Listo!</h3>
        <p className="text-white/70 text-sm leading-relaxed mb-5">
          Tu registro fue exitoso. Ahora ve a:
        </p>
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-4 text-left">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-900/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-amber-900/70 text-xs font-bold uppercase tracking-wide">Dirígete a</p>
              <p className="text-amber-950 font-extrabold text-lg">{location}</p>
            </div>
          </div>
        </div>
        <p className="text-white/40 text-xs mt-4">Muestra esta pantalla si te lo piden al llegar</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-white/70 text-sm font-medium mb-1.5">Nombre Completo *</label>
        <input
          name="full_name"
          value={form.full_name}
          onChange={handleChange}
          required
          placeholder="Ej: Juan García López"
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
        />
      </div>

      <div>
        <label className="block text-white/70 text-sm font-medium mb-1.5">Número de Celular *</label>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
          type="tel"
          placeholder="Ej: 5512345678"
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
        />
      </div>

      <div>
        <label className="block text-white/70 text-sm font-medium mb-1.5">Correo Electrónico *</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          type="email"
          placeholder="Ej: juan@correo.com"
          className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 transition-all"
        />
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-400/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-500/30 hover:shadow-emerald-400/40 text-sm tracking-wide mt-2"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Registrando...
          </span>
        ) : 'Registrar y Reclamar Premio →'}
      </button>
    </form>
  );
}
