'use client';
import { FireIcon } from '@heroicons/react/24/outline';

import { useState } from 'react';

type Step = 'phone' | 'scanning' | 'result';

export default function KioscoPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [points, setPoints] = useState<number | null>(null);
  const [tier, setTier] = useState('');
  const [streak, setStreak] = useState(0);
  const [error, setError] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length < 10) { setError('Ingresa tu número de 10 dígitos'); return; }
    setError('');
    setStep('scanning');

    try {
      const res = await fetch(`/api/customer-points?phone=${encodeURIComponent(phone)}`);
      const d = await res.json();
      const cp = d.points?.find((p: { phone: string }) => p.phone === phone);

      // Award 1 stamp point for the visit
      const earnRes = await fetch('/api/customer-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email: cp?.email ?? `${phone}@kiosco.local`, points_delta: 5 }),
      });
      const earnData = await earnRes.json();

      setPoints(5);
      setTier(earnData.tier ?? cp?.tier ?? 'bronze');
      setStreak(earnData.streak_days ?? 0);
      setTotalPoints(earnData.total_points ?? (cp?.total_points ?? 0) + 5);
      setStep('result');
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setStep('phone');
    }
  }

  function reset() {
    setStep('phone');
    setPhone('');
    setPoints(null);
    setError('');
  }

  const TIER_LABEL: Record<string, string> = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro' };
  const TIER_COLOR: Record<string, string> = { bronze: '#CD7F32', silver: '#94A3B8', gold: '#F59E0B' };

  return (
    <div className="min-h-screen bg-[#1C1917] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" width="64" height="58" className="mx-auto mb-3">
            <line x1="30" y1="28" x2="170" y2="28" stroke="white" strokeWidth="1.5" opacity="0.25"/>
            <text x="100" y="120" textAnchor="middle" fontFamily="Georgia, serif" fontSize="100" fill="white" letterSpacing="8">3E</text>
            <line x1="30" y1="132" x2="170" y2="132" stroke="white" strokeWidth="1.5" opacity="0.25"/>
          </svg>
          <p className="text-white/50 text-sm">Acumula tus puntos</p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit}>
            <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
              <label className="block text-white/70 text-sm mb-2">Tu número de teléfono</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="5512345678"
                className="w-full bg-white/15 text-white placeholder-white/30 text-2xl font-mono tracking-widest rounded-xl px-4 py-4 border border-white/20 focus:outline-none focus:border-white/50 text-center"
                autoFocus
              />
              {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
              <button
                type="submit"
                disabled={phone.length < 10}
                className="w-full mt-4 py-4 rounded-xl text-white font-bold text-lg disabled:opacity-30 transition-all"
                style={{ background: '#2563EB' }}
              >
                Acumular puntos
              </button>
            </div>
            <p className="text-white/30 text-xs text-center mt-4">Modo kiosco — auto-servicio</p>
          </form>
        )}

        {step === 'scanning' && (
          <div className="bg-white/10 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white text-lg font-semibold">Registrando visita...</p>
          </div>
        )}

        {step === 'result' && (
          <div className="bg-white rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3">✓</div>
            <h2 className="text-xl font-bold text-[#1C1917] mb-1">¡Visita registrada!</h2>
            <p className="text-stone-500 text-sm mb-6">+{points} puntos añadidos</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#FAFAF9] rounded-xl p-3">
                <p className="text-2xl font-extrabold text-[#2563EB]">{totalPoints.toLocaleString()}</p>
                <p className="text-xs text-stone-400 mt-0.5">Puntos totales</p>
              </div>
              <div className="bg-[#FAFAF9] rounded-xl p-3">
                <p className="text-2xl font-extrabold" style={{ color: TIER_COLOR[tier] ?? '#2563EB' }}>
                  {tier === 'gold' ? '' : tier === 'silver' ? '' : ''}
                </p>
                <p className="text-xs text-stone-400 mt-0.5">{TIER_LABEL[tier] ?? tier}</p>
              </div>
            </div>

            {streak > 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-amber-700 font-bold text-sm"><FireIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /> {streak} días de racha</p>
              </div>
            )}

            <button onClick={reset} className="w-full py-3 rounded-xl bg-[#1C1917] text-white font-bold">
              Listo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
