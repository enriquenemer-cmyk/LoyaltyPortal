'use client';
import { BookOpenIcon } from '@heroicons/react/24/outline';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Employee = {
  id: string;
  full_name: string;
  position: string | null;
  photo_url: string | null;
  total_training_points?: number;
};

type OpenEntry = {
  id: string;
  clock_in: string;
} | null;

export default function EmpleadosPanelPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [openEntry, setOpenEntry] = useState<OpenEntry>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [clocking, setClocking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch('/api/employees/me');
      if (res.status === 401) {
        router.replace('/empleados');
        return;
      }
      const data = await res.json();
      setEmployee(data.employee);
      setOpenEntry(data.openEntry ?? null);
    } catch {
      router.replace('/empleados');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  async function handleClockToggle() {
    if (clocking) return;
    setClocking(true);
    const action = openEntry ? 'out' : 'in';
    try {
      const res = await fetch('/api/employees/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Out of sync — refresh real state
          await loadMe();
        }
        showToast(data.error ?? 'Error al registrar fichaje.');
        return;
      }
      const time = new Date(data.entry.clock_in ?? data.entry.clock_out ?? Date.now()).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
      });
      if (data.status === 'clocked_in') {
        setOpenEntry({ id: data.entry.id, clock_in: data.entry.clock_in });
        showToast(`✓ ¡Entrada registrada a las ${time}!`);
      } else {
        setOpenEntry(null);
        showToast(`✓ ¡Salida registrada a las ${time}!`);
      }
    } catch {
      showToast('Error de conexión.');
    } finally {
      setClocking(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/employees/logout', { method: 'POST' });
    } finally {
      router.replace('/empleados');
    }
  }

  if (loading) {
    return (
      <div className="hero-gradient min-h-screen flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="text-white text-lg font-semibold">Cargando…</div>
      </div>
    );
  }

  if (!employee) return null;

  const clockedIn = !!openEntry;

  return (
    <div className="min-h-screen bg-[#FAFAF9]" style={{ minHeight: '100vh' }}>
      <div className="hero-gradient px-4 pt-8 pb-10">
        <div className="max-w-md mx-auto text-center">
          <p className="text-orange-200/80 text-sm font-semibold uppercase tracking-widest mb-1">Bienvenido/a</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{employee.full_name}</h1>
          {employee.position && <p className="text-orange-100/80 text-sm mt-1">{employee.position}</p>}

          <div className="mt-6 text-white">
            <div className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight">
              {now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-orange-200/70 text-sm mt-1 capitalize">
              {now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6 relative z-10 space-y-4 pb-10">
        {/* Clock button */}
        <button
          onClick={handleClockToggle}
          disabled={clocking}
          className={`w-full rounded-3xl shadow-xl text-white font-black text-xl flex items-center justify-center gap-3 transition-all disabled:opacity-60 ${
            clockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
          style={{ minHeight: 96 }}
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {clocking ? 'Procesando…' : clockedIn ? 'Marcar Salida' : 'Marcar Entrada'}
        </button>

        {typeof employee.total_training_points === 'number' && (
          <div className="bg-white border border-[#E8E3DC] rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-semibold text-stone-500">Puntos de capacitación</span>
            <span className="text-2xl font-black text-[#F97316]">
              {employee.total_training_points.toLocaleString('es-CO')}
            </span>
          </div>
        )}

        <Link
          href="/empleados/capacitacion"
          className="w-full flex items-center gap-4 bg-white border border-[#E8E3DC] rounded-2xl px-5 shadow-sm hover:border-[#F97316] transition-colors"
          style={{ minHeight: 64 }}
        >
          <span className="text-2xl"><BookOpenIcon className="w-5 h-5 inline-block align-middle" aria-hidden="true" /></span>
          <span className="text-base font-bold text-[#1C1917]">Capacitación</span>
          <svg className="w-5 h-5 text-stone-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-stone-500 hover:text-red-600 font-semibold text-sm transition-colors"
          style={{ minHeight: 56 }}
        >
          Cerrar sesión
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917] text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold toast-anim">
          {toast}
        </div>
      )}

      <style jsx>{`
        .toast-anim {
          animation: toast-in 0.3s ease-out;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
