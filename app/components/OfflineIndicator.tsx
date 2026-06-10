'use client';

import { useEffect, useState } from 'react';

type BannerState = 'offline' | 'restored' | 'hidden';

export default function OfflineIndicator() {
  const [state, setState] = useState<BannerState>('hidden');

  useEffect(() => {
    let restoredTimer: ReturnType<typeof setTimeout> | null = null;

    function handleOffline() {
      if (restoredTimer) clearTimeout(restoredTimer);
      setState('offline');
    }

    function handleOnline() {
      setState('restored');
      restoredTimer = setTimeout(() => setState('hidden'), 3000);
    }

    // Initialise from current status
    if (!navigator.onLine) setState('offline');

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (restoredTimer) clearTimeout(restoredTimer);
    };
  }, []);

  if (state === 'hidden') return null;

  if (state === 'restored') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#d1fae5',
          borderBottom: '1px solid #6ee7b7',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: '#065f46',
        }}
      >
        <span>✓ Conexión restaurada</span>
      </div>
    );
  }

  // offline
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#fef3c7',
        borderBottom: '1px solid #fcd34d',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 14,
        fontWeight: 600,
        color: '#1E40AF',
      }}
    >
      <span>📡 Sin conexión — Los datos mostrados pueden no estar actualizados</span>
    </div>
  );
}
