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

const NEXT_STATUS: Record<Comanda['status'], { next: Comanda['status']; label: string; emoji: string; bg: string } | null> = {
  pendiente:  { next: 'preparando', label: 'En Preparación', emoji: '🔥', bg: '#F97316' },
  preparando: { next: 'listo',      label: 'Listo',          emoji: '✅', bg: '#059669' },
  listo:      { next: 'entregado',  label: 'Entregado',      emoji: '📦', bg: '#7c3aed' },
  entregado: null,
};

const COLUMNS: { status: Comanda['status']; title: string; color: string; emoji: string }[] = [
  { status: 'pendiente',  title: 'Nuevas',        color: '#dc2626', emoji: '🆕' },
  { status: 'preparando', title: 'En Preparación', color: '#F97316', emoji: '🔥' },
  { status: 'listo',      title: 'Listo para entregar', color: '#059669', emoji: '✅' },
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
              {/* Column header */}
              <div className="flex items-center gap-2 px-2 py-2 rounded-xl" style={{ background: col.color + '22', border: `1px solid ${col.color}44` }}>
                <span className="text-lg">{col.emoji}</span>
                <p className="text-sm font-black text-white flex-1">{col.title}</p>
                <span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{ background: col.color }}>
                  {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p className="text-white/20 text-sm">{loading ? 'Cargando…' : 'Sin pedidos aquí'}</p>
                </div>
              ) : (
                items.map((c) => {
                  const step = NEXT_STATUS[c.status];
                  const mins = Math.floor((Date.now() - new Date(c.created_at).getTime()) / 60000);
                  const urgent = mins >= 15;
                  return (
                    <div key={c.id} className="rounded-2xl p-4 flex flex-col gap-3"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: `2px solid ${urgent ? '#ef4444' : col.color}55`,
                        boxShadow: urgent ? '0 0 0 1px #ef444444' : 'none',
                      }}>
                      {/* Time + total */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: urgent ? '#ef444433' : 'rgba(255,255,255,0.08)', color: urgent ? '#fca5a5' : 'rgba(255,255,255,0.5)' }}>
                          {urgent ? '⚠️ ' : '⏱ '}{timeAgo(c.created_at)}
                        </span>
                        <span className="text-sm font-black text-white">${Number(c.total_amount).toLocaleString('es-CO')}</span>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1.5">
                        {c.items.map((it, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0"
                              style={{ background: col.color + '99' }}>
                              {it.quantity}
                            </span>
                            <p className="text-sm text-white font-semibold leading-tight">{it.product_name}</p>
                          </div>
                        ))}
                      </div>

                      {c.employee_name && (
                        <p className="text-[10px] text-white/30">Cajero: {c.employee_name}</p>
                      )}

                      {/* Big action button */}
                      {step && (
                        <button onClick={() => advance(c)}
                          className="w-full py-3 rounded-xl font-black text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                          style={{ background: step.bg, fontSize: '15px', letterSpacing: '0.01em', boxShadow: `0 4px 16px ${step.bg}55` }}>
                          <span>{step.emoji}</span>
                          <span>{step.label}</span>
                        </button>
                      )}
                      {!step && (
                        <div className="w-full py-3 rounded-xl text-center font-bold text-white/30 text-sm"
                          style={{ background: 'rgba(255,255,255,0.05)' }}>
                          ✓ Completado
                        </div>
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
