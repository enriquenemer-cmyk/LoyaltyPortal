'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushNotificationManager({ phone }: { phone?: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'subscribed' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    // Check if already subscribed
    navigator.serviceWorker.ready.then(async (reg) => {
      const existing = await reg.pushManager.getSubscription();
      if (existing) setStatus('subscribed');
    }).catch(() => {});
  }, []);

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/push/vapid-public-key');
      const { publicKey } = await res.json() as { publicKey?: string };
      if (!publicKey) throw new Error('Sin clave pública VAPID');

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      });

      const subJson = sub.toJSON() as {
        endpoint: string;
        keys?: { p256dh?: string; auth?: string };
      };

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: {
            p256dh: subJson.keys?.p256dh ?? '',
            auth: subJson.keys?.auth ?? '',
          },
          phone: phone ?? null,
        }),
      });

      setStatus('subscribed');
    } catch (err) {
      console.error('[PushNotificationManager] subscribe error:', err);
      if (Notification.permission === 'denied') {
        setStatus('denied');
      } else {
        setStatus('idle');
      }
    }
  }

  if (status === 'unsupported') return null;

  if (status === 'subscribed') {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Notificaciones activas ✓
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        Notificaciones bloqueadas — actívalas en ajustes del navegador
      </div>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={status === 'loading'}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
      style={{
        background: status === 'loading' ? '#DBEAFE' : '#2563EB',
        color: status === 'loading' ? '#1D4ED8' : '#fff',
        border: 'none',
        cursor: status === 'loading' ? 'wait' : 'pointer',
      }}
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {status === 'loading' ? 'Activando...' : 'Activar notificaciones'}
    </button>
  );
}
