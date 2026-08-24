'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

const MAX_PIN_LENGTH = 6;

export default function EmpleadosLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleDigit = useCallback(
    (digit: string) => {
      if (submitting) return;
      setError(null);
      setPin((prev) => (prev.length >= MAX_PIN_LENGTH ? prev : prev + digit));
    },
    [submitting]
  );

  const handleClear = useCallback(() => {
    if (submitting) return;
    setError(null);
    setPin('');
  }, [submitting]);

  const handleBackspace = useCallback(() => {
    if (submitting) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [submitting]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/employees/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'PIN incorrecto.');
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 500);
        return;
      }
      router.push('/empleados/panel');
    } catch {
      setError('Error de conexión.');
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 500);
    } finally {
      setSubmitting(false);
    }
  }, [pin, submitting, router]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="hero-gradient min-h-screen flex items-center justify-center px-4 py-8"
      style={{ minHeight: '100vh' }}
    >
      <div
        className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 sm:p-8 ${shake ? 'shake-anim' : ''}`}
      >
        <div className="text-center mb-6">
          <div className="text-3xl font-black text-[#1C1917] tracking-tight">
            3E
          </div>
          <p className="text-stone-500 text-sm font-medium mt-1">Ingresa tu PIN</p>
        </div>

        {/* PIN dots display */}
        <div className="flex items-center justify-center gap-3 mb-5 h-10">
          {Array.from({ length: Math.max(pin.length, 4) }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                i < pin.length ? 'bg-[#F97316] border-[#F97316]' : 'border-stone-300 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 text-center text-red-600 text-sm font-semibold bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => handleDigit(k)}
              disabled={submitting}
              className="rounded-2xl bg-[#FAFAF9] hover:bg-orange-50 active:bg-orange-100 border border-[#E8E3DC] text-2xl font-bold text-[#1C1917] transition-colors disabled:opacity-50"
              style={{ minHeight: 64 }}
            >
              {k}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            disabled={submitting}
            className="rounded-2xl bg-stone-100 hover:bg-stone-200 border border-[#E8E3DC] text-sm font-bold text-stone-500 transition-colors disabled:opacity-50"
            style={{ minHeight: 64 }}
          >
            Borrar
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            disabled={submitting}
            className="rounded-2xl bg-[#FAFAF9] hover:bg-orange-50 active:bg-orange-100 border border-[#E8E3DC] text-2xl font-bold text-[#1C1917] transition-colors disabled:opacity-50"
            style={{ minHeight: 64 }}
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={submitting}
            className="rounded-2xl bg-stone-100 hover:bg-stone-200 border border-[#E8E3DC] text-xl font-bold text-stone-500 transition-colors disabled:opacity-50"
            style={{ minHeight: 64 }}
          >
            ⌫
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || pin.length < 4}
          className="w-full rounded-2xl bg-[#F97316] hover:bg-[#C2410C] disabled:opacity-50 text-white text-lg font-bold transition-colors"
          style={{ minHeight: 56 }}
        >
          {submitting ? 'Verificando…' : 'Ingresar'}
        </button>
      </div>

      <style jsx>{`
        .shake-anim {
          animation: shake-kf 0.5s;
        }
        @keyframes shake-kf {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
