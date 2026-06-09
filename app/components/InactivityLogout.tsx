'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const INACTIVITY_MS = 30 * 60 * 1000; // 30 min
const WARNING_MS = 28 * 60 * 1000;    // warn at 28 min (2 min before logout)

export default function InactivityLogout() {
  const router = useRouter();
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only active on admin pages (not login)
  const isAdminPage = pathname?.startsWith('/admin') && !pathname?.startsWith('/admin/login');

  function reset() {
    if (!isAdminPage) return;
    setShowWarning(false);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);

    warnTimer.current = setTimeout(() => {
      setShowWarning(true);
    }, WARNING_MS);

    logoutTimer.current = setTimeout(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login?reason=inactivity');
    }, INACTIVITY_MS);
  }

  useEffect(() => {
    if (!isAdminPage) return;
    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminPage]);

  if (!showWarning || !isAdminPage) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-[#E8E3DC] text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#1C1917] mb-2">¿Sigues ahí?</h3>
        <p className="text-stone-500 text-sm mb-6">
          Tu sesión se cerrará en <strong>2 minutos</strong> por inactividad.
        </p>
        <button
          onClick={reset}
          className="w-full py-3 rounded-xl text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#E8521A,#C2410C)' }}
        >
          Continuar sesión
        </button>
      </div>
    </div>
  );
}
