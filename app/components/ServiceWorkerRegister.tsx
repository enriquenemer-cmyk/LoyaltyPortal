'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — non-critical
    });

    // When connection is restored, ask SW to flush queued deliveries
    function handleOnline() {
      navigator.serviceWorker.ready.then((reg) => {
        // Try Background Sync API first; fall back to postMessage
        if ('sync' in reg) {
          (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } })
            .sync.register('delivery-sync').catch(() => {
              reg.active?.postMessage({ type: 'FLUSH_QUEUE' });
            });
        } else {
          reg.active?.postMessage({ type: 'FLUSH_QUEUE' });
        }
      });
    }

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null;
}
