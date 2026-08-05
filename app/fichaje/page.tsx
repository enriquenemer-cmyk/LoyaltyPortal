'use client';

import { useCallback, useEffect, useState } from 'react';

type Employee = {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
};

type OpenEntry = {
  id: string;
  clock_in: string;
};

type Phase = 'pin' | 'clocked' | 'confirm';

const MAX_PIN_LENGTH = 6;

export default function FichajePage() {
  const [phase, setPhase] = useState<Phase>('pin');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [openEntry, setOpenEntry] = useState<OpenEntry | null>(null);
  const [now, setNow] = useState(new Date());
  const [confirmMessage, setConfirmMessage] = useState<string>('');

  // live clock
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const resetToPin = useCallback(() => {
    setPin('');
    setError(null);
    setEmployee(null);
    setOpenEntry(null);
    setPhase('pin');
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/employees/me');
      if (res.ok) {
        const data = await res.json();
        if (data.employee) {
          setEmployee(data.employee);
          setOpenEntry(data.openEntry);
          setPhase('clocked');
        }
      }
    } catch {
      // ignore, stays on pin screen
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  function handleDigit(d: string) {
    if (loading) return;
    setError(null);
    setPin((prev) => (prev.length < MAX_PIN_LENGTH ? prev + d : prev));
  }

  function handleBackspace() {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
  }

  async function handleConfirmPin() {
    if (pin.length < 4) {
      setError('El PIN debe tener al menos 4 dígitos.');
      return;
    }
    setLoading(true);
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
        setPin('');
      } else {
        setEmployee(data.employee);
        setPin('');
        await checkSession();
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleClockAction(action: 'in' | 'out') {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/employees/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'No se pudo registrar el fichaje.');
        return;
      }

      setConfirmMessage(action === 'in' ? 'Entrada registrada' : 'Salida registrada');
      setPhase('confirm');

      // logout employee session after confirmation, then back to PIN screen
      setTimeout(async () => {
        try {
          await fetch('/api/employees/logout', { method: 'POST' });
        } catch {
          // ignore
        }
        resetToPin();
      }, 3000);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const timeString = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 35%, #2563eb 60%, #7c3aed 100%)',
      }}
    >
      <div className="w-full max-w-md">
        {phase === 'pin' && (
          <div
            className="rounded-3xl p-6 sm:p-8"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
          >
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
                style={{ background: 'rgba(37,99,235,0.1)', color: '#1d4ed8' }}
              >
                ⏰ Control de Horarios
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">Ingresa tu PIN</h1>
              <p className="text-stone-500 text-sm mt-1">{timeString}</p>
            </div>

            {/* PIN dots */}
            <div className="flex items-center justify-center gap-3 mb-6">
              {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full transition-all"
                  style={{
                    background: i < pin.length ? '#2563eb' : '#e5e7eb',
                    transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3 text-center">
                {error}
              </div>
            )}

            {/* Numeric keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  disabled={loading}
                  className="aspect-square rounded-2xl text-2xl font-bold text-[#1C1917] bg-stone-100 hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-50"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={loading}
                className="aspect-square rounded-2xl text-lg font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={loading}
                className="aspect-square rounded-2xl text-2xl font-bold text-[#1C1917] bg-stone-100 hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleConfirmPin}
                disabled={loading || pin.length < 4}
                className="aspect-square rounded-2xl text-lg font-bold text-white bg-[#2563EB] hover:bg-[#1d4ed8] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center"
              >
                {loading ? '…' : '✓'}
              </button>
            </div>
          </div>
        )}

        {phase === 'clocked' && employee && (
          <div
            className="rounded-3xl p-6 sm:p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
          >
            <div
              className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-black"
              style={{ background: 'rgba(37,99,235,0.1)', color: '#1d4ed8' }}
            >
              {employee.full_name.slice(0, 1).toUpperCase()}
            </div>
            <h2 className="text-xl font-black text-[#1C1917]">{employee.full_name}</h2>
            {employee.position && <p className="text-stone-500 text-sm">{employee.position}</p>}

            <div className="my-6">
              <p className="text-4xl font-black text-[#1C1917] tracking-tight tabular-nums">{timeString}</p>
              <p className="text-stone-500 text-sm capitalize mt-1">{dateString}</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3 text-center">
                {error}
              </div>
            )}

            {openEntry ? (
              <button
                type="button"
                onClick={() => handleClockAction('out')}
                disabled={loading}
                className="w-full py-6 rounded-2xl text-xl font-black text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all disabled:opacity-60"
                style={{ boxShadow: '0 8px 24px rgba(239,68,68,0.35)' }}
              >
                {loading ? 'Registrando…' : 'Marcar Salida'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleClockAction('in')}
                disabled={loading}
                className="w-full py-6 rounded-2xl text-xl font-black text-white bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-60"
                style={{ boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}
              >
                {loading ? 'Registrando…' : 'Marcar Entrada'}
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                await fetch('/api/employees/logout', { method: 'POST' });
                resetToPin();
              }}
              className="mt-4 text-sm font-medium text-stone-400 hover:text-stone-600"
            >
              No soy yo, cambiar de usuario
            </button>
          </div>
        )}

        {phase === 'confirm' && (
          <div
            className="rounded-3xl p-10 text-center"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
          >
            <div
              className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center animate-[scale-in_0.3s_ease-out]"
              style={{ background: 'rgba(16,185,129,0.12)' }}
            >
              <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-[#1C1917]">{confirmMessage}</h2>
            <p className="text-stone-500 text-sm mt-2">¡Que tengas un excelente turno!</p>
          </div>
        )}
      </div>
    </div>
  );
}
