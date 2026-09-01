'use client';

import { useCallback, useEffect, useState } from 'react';

type ComandaItem = { product_name: string; quantity: number; unit: string };
type Comanda = {
  id: string;
  employee_name: string | null;
  total_amount: string;
  payment_method: string;
  status: 'pendiente' | 'preparando' | 'listo' | 'entregado';
  created_at: string;
  items: ComandaItem[];
};

type Phase = 'pin' | 'board';
const MAX_PIN_LENGTH = 6;

const NEXT_STATUS: Record<Comanda['status'], { next: Comanda['status']; label: string } | null> = {
  pendiente: { next: 'preparando', label: 'Empezar a preparar' },
  preparando: { next: 'listo', label: 'Marcar listo' },
  listo: { next: 'entregado', label: 'Marcar entregado' },
  entregado: null,
};

const COLUMNS: { status: Comanda['status']; title: string; color: string }[] = [
  { status: 'pendiente', title: 'Pendiente', color: '#dc2626' },
  { status: 'preparando', title: 'Preparando', color: '#F97316' },
  { status: 'listo', title: 'Listo', color: '#059669' },
];

function timeAgo(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  return `hace ${mins} min`;
}

export default function ComandaPage() {
  const [phase, setPhase] = useState<Phase>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState('');

  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(false);

  const resetToPin = useCallback(() => {
    setPin('');
    setPinError(null);
    setPhase('pin');
  }, []);

  const loadComandas = useCallback(async () => {
    try {
      const res = await fetch('/api/pos/comandas');
      const data = await res.json();
      if (res.ok) setComandas(data.comandas ?? []);
    } catch {
      // ignore, keep last known state
    } finally {
      setLoading(false);
    }
  }, []);

  async function checkSession() {
    try {
      const res = await fetch('/api/employees/me');
      if (res.ok) {
        const data = await res.json();
        if (data.employee) {
          setEmployeeName(data.employee.full_name);
          setPhase('board');
        }
      }
    } catch {
      // stays on pin screen
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (phase !== 'board') return;
    setLoading(true);
    loadComandas();
    const interval = setInterval(loadComandas, 4000);
    return () => clearInterval(interval);
  }, [phase, loadComandas]);

  function handleDigit(d: string) {
    if (pinLoading) return;
    setPinError(null);
    setPin((prev) => (prev.length < MAX_PIN_LENGTH ? prev + d : prev));
  }

  function handleBackspace() {
    if (pinLoading) return;
    setPin((prev) => prev.slice(0, -1));
  }

  async function handleConfirmPin() {
    if (pin.length < 4) {
      setPinError('El PIN debe tener al menos 4 dígitos.');
      return;
    }
    setPinLoading(true);
    setPinError(null);
    try {
      const res = await fetch('/api/employees/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error ?? 'PIN incorrecto.');
        setPin('');
      } else {
        setPin('');
        await checkSession();
      }
    } catch {
      setPinError('Error de conexión. Intenta de nuevo.');
    } finally {
      setPinLoading(false);
    }
  }

  async function advance(comanda: Comanda) {
    const step = NEXT_STATUS[comanda.status];
    if (!step) return;
    setComandas((prev) => prev.map((c) => (c.id === comanda.id ? { ...c, status: step.next } : c)));
    try {
      await fetch(`/api/pos/comandas/${comanda.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: step.next }),
      });
    } catch {
      // next poll will reconcile
    }
    loadComandas();
  }

  if (phase === 'pin') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ background: 'linear-gradient(135deg, #7C2D12 0%, #1C1917 45%, #292524 70%, #059669 100%)' }}
      >
        <div className="w-full max-w-md">
          <div
            className="rounded-3xl p-6 sm:p-8"
            style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}
          >
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest mb-3"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#C2410C' }}
              >
                Cocina · Almacén
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1C1917] tracking-tight">Ingresa tu PIN</h1>
            </div>

            <div className="flex items-center justify-center gap-3 mb-6">
              {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full transition-all"
                  style={{
                    background: i < pin.length ? '#F97316' : '#e5e7eb',
                    transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>

            {pinError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3 text-center">
                {pinError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDigit(d)}
                  disabled={pinLoading}
                  className="aspect-square rounded-2xl text-2xl font-bold text-[#1C1917] bg-stone-100 hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-50"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={handleBackspace}
                disabled={pinLoading}
                className="aspect-square rounded-2xl text-lg font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => handleDigit('0')}
                disabled={pinLoading}
                className="aspect-square rounded-2xl text-2xl font-bold text-[#1C1917] bg-stone-100 hover:bg-orange-50 active:scale-95 transition-all disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleConfirmPin}
                disabled={pinLoading || pin.length < 4}
                className="aspect-square rounded-2xl text-lg font-bold text-white bg-[#F97316] hover:bg-[#C2410C] active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center"
              >
                {pinLoading ? '…' : '✓'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1C1917] flex flex-col">
      <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
        <div>
          <p className="text-white font-black text-lg">Comandas</p>
          <p className="text-white/40 text-xs">{employeeName} · se actualiza solo</p>
        </div>
        <button onClick={resetToPin} className="text-xs font-semibold text-white/40 hover:text-white/70">
          Cambiar de usuario
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-y-auto">
        {COLUMNS.map((col) => {
          const items = comandas.filter((c) => c.status === col.status);
          return (
            <div key={col.status} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                <p className="text-sm font-black text-white uppercase tracking-wider">{col.title}</p>
                <span className="text-xs font-bold text-white/40">{items.length}</span>
              </div>

              {items.length === 0 ? (
                <p className="text-xs text-white/25 px-1">{loading ? 'Cargando…' : 'Sin comandas'}</p>
              ) : (
                items.map((c) => {
                  const step = NEXT_STATUS[c.status];
                  return (
                    <div key={c.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${col.color}55` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wide">{timeAgo(c.created_at)}</span>
                        <span className="text-xs font-black text-white">${Number(c.total_amount).toLocaleString('es-CO')}</span>
                      </div>
                      <div className="space-y-1 mb-3">
                        {c.items.map((it, i) => (
                          <p key={i} className="text-sm text-white/90 font-semibold">
                            {it.quantity} × {it.product_name}
                          </p>
                        ))}
                      </div>
                      {c.employee_name && (
                        <p className="text-[10px] text-white/30 mb-3">Cajero: {c.employee_name}</p>
                      )}
                      {step && (
                        <button
                          onClick={() => advance(c)}
                          className="w-full py-2 rounded-xl text-xs font-black text-white transition-all active:scale-95"
                          style={{ background: col.color }}
                        >
                          {step.label}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
